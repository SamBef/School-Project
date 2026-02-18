/**
 * AI service — optional LLM calls (e.g. OpenAI).
 * Used for user-triggered features only; app works without OPENAI_API_KEY.
 */

import { config } from '../config.js';

const VALID_CATEGORIES = ['RENT', 'STOCK_INVENTORY', 'UTILITIES', 'TRANSPORT', 'MISCELLANEOUS'];

/**
 * Suggest expense category from description using OpenAI.
 * @param {string} description - Expense description (e.g. "Electricity bill January")
 * @returns {Promise<{ category: string }>}
 * @throws {Error} If API key missing, request fails, or response invalid
 */
export async function suggestExpenseCategory(description) {
  const key = config.openaiApiKey?.trim();
  if (!key) {
    const err = new Error('AI_NOT_CONFIGURED');
    err.statusCode = 503;
    throw err;
  }

  const systemPrompt = `You are KoboAI, the friendly business advisor for KoboTrack. You suggest expense categories. Reply with exactly one of: RENT, STOCK_INVENTORY, UTILITIES, TRANSPORT, MISCELLANEOUS. Reply with only that single word, nothing else.`;
  const userPrompt = `Expense description: ${description}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 20,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = new Error(res.status === 429 ? 'RATE_LIMITED' : 'AI_REQUEST_FAILED');
    err.statusCode = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const err = new Error('AI_INVALID_RESPONSE');
    err.statusCode = 502;
    throw err;
  }

  const category = content.toUpperCase().replace(/\s+/g, '_');
  if (!VALID_CATEGORIES.includes(category)) {
    return { category: 'MISCELLANEOUS' };
  }
  return { category };
}

/**
 * Call OpenAI Chat Completions with a system + user message. Returns content string.
 * @throws {Error} statusCode 503 if no key, 429 if rate limited, 502 on other failure
 */
async function chat(systemPrompt, userContent, maxTokens = 1500) {
  const key = config.openaiApiKey?.trim();
  if (!key) {
    const err = new Error('AI_NOT_CONFIGURED');
    err.statusCode = 503;
    throw err;
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = new Error(res.status === 429 ? 'RATE_LIMITED' : 'AI_REQUEST_FAILED');
    err.statusCode = res.status === 429 ? 429 : 502;
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const err = new Error('AI_INVALID_RESPONSE');
    err.statusCode = 502;
    throw err;
  }
  return content;
}

/**
 * Generate restocking and product insights from inventory metrics and location.
 * @param {{ primaryLocation: string, address?: string, currency: string, dateFrom: string, dateTo: string, globalMinStock?: number, products: Array<{ productName: string, quantitySold: number, revenue: number, currentStock: number, minStock?: number }> }} context
 * @returns {Promise<{ insights: string, recommendations: Array<{ type: string, productName?: string, reasoning: string, confidence?: string }> }>}
 */
export async function getRestockingInsights(context) {
  const systemPrompt = `You are KoboAI, the business advisor for KoboTrack. You are friendly, concise, and professional. You receive inventory and sales data for a selectable period. Your task is to produce concise, actionable insights.

Personality: Speak in first person where natural (e.g. "I recommend...", "Based on your data..."). Be supportive and clear. No jargon unless necessary.

Rules:
- Base every recommendation on the data provided. Reference specific numbers (e.g. "Sold 45 units in the period; 12 left").
- Use frameworks only when they add clarity (e.g. "high sell-through" vs "low stock").
- Output a short summary paragraph (2–4 sentences) and a list of recommendations.
- For each recommendation include: type (one of: RESTOCK_URGENT, UNDERPERFORMER, REORDER_TIMING, HIGH_MARGIN_OPPORTUNITY), productName when relevant, reasoning, and optional confidence (HIGH/MEDIUM/LOW).
- Be professional and concise. No filler.`;

  const locationLine = context.address
    ? `Business location: ${context.primaryLocation} (${context.address})`
    : `Business location: ${context.primaryLocation}`;
  const globalMin = context.globalMinStock != null ? `Global min stock threshold: ${context.globalMinStock}` : 'No global min stock set.';
  const productsText = context.products
    .map(
      (p) =>
        `- ${p.productName}: sold ${p.quantitySold} units, revenue ${context.currency} ${p.revenue}, current stock ${p.currentStock}` +
        (p.minStock != null ? `, min stock ${p.minStock}` : '')
    )
    .join('\n');

  const userContent = `Period: ${context.dateFrom} to ${context.dateTo}. ${locationLine}. ${globalMin}

Products (sales and stock in period):
${productsText || '(No products or no sales data)'}

Provide:
1. A short summary (2–4 sentences) of restocking and performance insights for this business in this location.
2. A JSON array of recommendations. Each object: { "type": "RESTOCK_URGENT"|"UNDERPERFORMER"|"REORDER_TIMING"|"HIGH_MARGIN_OPPORTUNITY", "productName": "optional", "reasoning": "one sentence with data", "confidence": "HIGH"|"MEDIUM"|"LOW" }.
Reply with the summary first, then a line "---RECOMMENDATIONS---", then the JSON array only.`;

  const content = await chat(systemPrompt, userContent, 2000);
  const [summaryPart, jsonPart] = content.includes('---RECOMMENDATIONS---')
    ? content.split('---RECOMMENDATIONS---').map((s) => s.trim())
    : [content, '[]'];
  let recommendations = [];
  try {
    const match = jsonPart.match(/\[[\s\S]*\]/);
    if (match) {
      recommendations = JSON.parse(match[0]);
    }
  } catch {
    // leave empty if parse fails
  }
  return { insights: summaryPart, recommendations };
}

/**
 * Generate strategic insights (Porter's Five Forces, SWOT) from business location and product list.
 * @param {{ businessName: string, primaryLocation: string, address?: string, productNames: string[] }} context
 * @returns {Promise<{ insights: string, frameworks: Array<{ name: string, content: string }> }>}
 */
export async function getStrategicInsights(context) {
  const systemPrompt = `You are KoboAI, the business advisor for KoboTrack. You are friendly, concise, and professional. You receive the business's location and list of products (or product categories). There is no external market database: base your analysis on general knowledge of similar businesses in that geography and sector.

Personality: Speak in first person where natural (e.g. "I see...", "For your location..."). Be supportive and actionable. No jargon unless necessary.

Rules:
- Apply Porter's Five Forces and SWOT. Optionally add 1–2 bullet points from PESTLE (macro factors) or product-prioritization (BCG-style) if relevant.
- Be concise. Each framework: 3–6 bullet points. Label each section clearly (e.g. "Porter's Five Forces", "SWOT").
- Geo-contextualize: reference the business's location (e.g. "In [city], competition often…").
- Do not make up specific competitor names; speak in terms of "local competitors", "rivals in the area".
- Tone: professional, actionable.`;

  const locationLine = context.address
    ? `Location: ${context.primaryLocation} (${context.address})`
    : `Location: ${context.primaryLocation}`;
  const productsLine =
    context.productNames?.length > 0
      ? `Products / offerings: ${context.productNames.join(', ')}`
      : 'No product list provided.';

  const userContent = `Business name: ${context.businessName || 'SME'}. ${locationLine}. ${productsLine}

Provide strategic insights in this format:
1. A short intro paragraph (2–3 sentences) tying location and product mix to the local market.
2. A section "Porter's Five Forces" with bullet points.
3. A section "SWOT" with Strengths, Weaknesses, Opportunities, Threats as bullets.
4. Optionally "PESTLE" or "Product prioritization" if relevant (brief).

Use clear headings. Be concise and professional.`;

  const content = await chat(systemPrompt, userContent, 2000);
  const frameworks = [];
  const sections = [
    { name: "Porter's Five Forces", re: /Porter'?s? Five Forces?/i },
    { name: 'SWOT', re: /\bSWOT\b/i },
    { name: 'PESTLE', re: /\bPESTLE\b/i },
    { name: 'Product prioritization', re: /Product prioritization|BCG/i },
  ];
  let remaining = content;
  for (const { name, re } of sections) {
    const match = remaining.match(re);
    if (match) {
      const start = remaining.indexOf(match[0]);
      let end = remaining.length;
      for (const other of sections) {
        if (other.name === name) continue;
        const nextMatch = remaining.slice(start + 1).match(other.re);
        if (nextMatch) {
          const nextStart = start + 1 + nextMatch.index;
          if (nextStart < end) end = nextStart;
        }
      }
      frameworks.push({ name, content: remaining.slice(start, end).trim() });
    }
  }
  if (frameworks.length === 0) {
    frameworks.push({ name: 'Strategic insights', content });
  }
  return { insights: content, frameworks };
}

const KOBOAI_SYSTEM = `You are KoboAI, the friendly business advisor for KoboTrack. You are concise, calm, and actionable. Reply in plain language.`;

/**
 * Transaction insights: suggest product name/category and flag possible duplicate or unusual transaction.
 * @param {{ itemText: string, recentItemNames?: string[], recentTotals?: number[] }}
 * @returns {Promise<{ suggestedName?: string, suggestedCategory?: string, isPossibleDuplicate?: boolean, note?: string }>}
 */
export async function getTransactionInsights({ itemText, recentItemNames = [], recentTotals = [] }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You help with sales transactions. Given what the user is typing (product or line item) and optional recent item names and totals, reply with a JSON object only, no markdown, with optional keys:
- suggestedName: a cleaned product name if the input looks like a shorthand or typo
- suggestedCategory: one word (e.g. Beverage, Food, Merchandise) if inferable
- isPossibleDuplicate: true only if the item text and recent items strongly suggest the same sale was already entered
- note: one short sentence if something is unusual (e.g. very high total), otherwise omit
If you cannot infer anything, return {}.`;

  const userContent = `Item text: "${itemText || ''}"
Recent item names: ${recentItemNames.slice(-10).join(', ') || 'none'}
Recent totals: ${recentTotals.slice(-5).join(', ') || 'none'}
Reply with a single JSON object only.`;

  const content = await chat(systemPrompt, userContent, 200);
  try {
    const parsed = JSON.parse((content.replace(/^[^{]*|[^}]*$/g, '').trim() || '{}'));
    const out = typeof parsed === 'string' ? {} : parsed;
    return {
      suggestedName: out.suggestedName ?? undefined,
      suggestedCategory: out.suggestedCategory ?? undefined,
      isPossibleDuplicate: Boolean(out.isPossibleDuplicate),
      note: out.note ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Cash flow summary: short comparison vs previous period.
 * @param {{ revenue: number, expenses: number, previousRevenue: number, previousExpenses: number, days: number }}
 * @returns {Promise<{ summary: string }>}
 */
export async function getCashFlowSummary({ revenue, expenses, previousRevenue, previousExpenses, days = 30 }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You receive revenue and expenses for the current period and the previous period. Reply with one or two short sentences: how revenue and expenses compare to the previous period (e.g. "Revenue up, expenses flat" or "Expenses up vs last period."). No bullet lists. Plain language.`;

  const userContent = `Current period (last ${days} days): revenue ${revenue}, expenses ${expenses}.
Previous period (same length before): revenue ${previousRevenue}, expenses ${previousExpenses}.
One or two sentence summary only.`;

  const summary = await chat(systemPrompt, userContent, 120);
  return { summary: summary.trim() };
}

/**
 * Expense insights: suggest tags, recurring hint, or similar-past note.
 * @param {{ description: string, category: string, recentDescriptions?: string[] }}
 * @returns {Promise<{ suggestedTags?: string[], isRecurring?: boolean, note?: string }>}
 */
export async function getExpenseInsights({ description, category, recentDescriptions = [] }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You help with expenses. Reply with a JSON object only, no markdown. Optional keys:
- suggestedTags: array of 1-4 short tags (e.g. ["office", "monthly"])
- isRecurring: true if the description suggests a recurring expense (rent, subscription, utility)
- note: one short sentence about similar past expenses or consistency, or omit
If nothing to add, return {}.`;

  const userContent = `Description: "${description}". Category: ${category}.
Recent expense descriptions: ${recentDescriptions.slice(-8).join('; ') || 'none'}
JSON only.`;

  const content = await chat(systemPrompt, userContent, 150);
  try {
    const out = JSON.parse((content.replace(/^[^{]*|[^}]*$/g, '').trim() || '{}'));
    return {
      suggestedTags: Array.isArray(out.suggestedTags) ? out.suggestedTags.slice(0, 4) : undefined,
      isRecurring: Boolean(out.isRecurring),
      note: out.note ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Extract line items and total from receipt text (no image; text only).
 * @param {{ text: string }}
 * @returns {Promise<{ items: Array<{ name: string, quantity: number, unitPrice?: number }>, total?: number, suggestedCategory?: string }>}
 */
export async function getReceiptExtract({ text }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You extract structured data from receipt or invoice text. Reply with a single JSON object only, no markdown:
- items: array of { name: string, quantity: number, unitPrice?: number } (name trimmed, quantity integer, unitPrice number)
- total: number if a total/grand total is clearly stated
- suggestedCategory: one word (e.g. Supplies, Food) for the overall receipt, or omit
If the text is empty or not a receipt, return { items: [] }.`;

  const userContent = `Receipt/invoice text:\n${(text || '').slice(0, 4000)}\n\nJSON only.`;

  const content = await chat(systemPrompt, userContent, 800);
  try {
    const out = JSON.parse((content.replace(/^[^{]*|[^}]*$/g, '').trim() || '{}'));
    const items = Array.isArray(out.items)
      ? out.items.map((i) => ({
          name: String(i.name || '').trim() || 'Item',
          quantity: Math.max(1, Number(i.quantity) || 1),
          unitPrice: typeof i.unitPrice === 'number' ? i.unitPrice : undefined,
        }))
      : [];
    return {
      items,
      total: typeof out.total === 'number' ? out.total : undefined,
      suggestedCategory: out.suggestedCategory ?? undefined,
    };
  } catch {
    return { items: [] };
  }
}

/**
 * Contextual usage tip for a page.
 * @param {{ page: string }}
 * @returns {Promise<{ tip: string }>}
 */
export async function getUsageTip({ page }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You give one short, friendly tip for a specific page in KoboTrack. No bullet lists. One sentence only. Pages: dashboard, transactions, expenses, analysis, inventory. Be helpful and specific (e.g. "Record a transaction to see sales in Analysis." or "You haven't added expenses this month—track them to see trends.").`;

  const userContent = `Page: ${page || 'dashboard'}. One sentence tip only.`;

  const tip = await chat(systemPrompt, userContent, 80);
  return { tip: tip.trim() };
}

/**
 * One-sentence period summary for reporting.
 * @param {{ revenue: number, expenses: number, transactionCount: number, days: number, previousRevenue?: number, previousExpenses?: number }}
 * @returns {Promise<{ summary: string }>}
 */
export async function getPeriodSummary({ revenue, expenses, transactionCount, days, previousRevenue, previousExpenses }) {
  const systemPrompt = `${KOBOAI_SYSTEM}
You summarize a period in one sentence for quick review. Include revenue and expense trend if previous period given (e.g. "Last 30 days: revenue up 10%, expenses flat."). Otherwise state totals and transaction count briefly. One sentence only.`;

  const userContent = `Last ${days} days: revenue ${revenue}, expenses ${expenses}, ${transactionCount} transactions.
${previousRevenue != null && previousExpenses != null ? `Previous period: revenue ${previousRevenue}, expenses ${previousExpenses}.` : ''}
One sentence summary only.`;

  const summary = await chat(systemPrompt, userContent, 100);
  return { summary: summary.trim() };
}

/**
 * Format a list of alert items into a short KoboAI summary.
 * @param {{ alerts: Array<{ type: string, message: string }> }}
 * @returns {Promise<{ summary: string }>}
 */
export async function getAlertsSummary({ alerts = [] }) {
  if (!alerts.length) {
    return { summary: '' };
  }
  const systemPrompt = `${KOBOAI_SYSTEM}
You receive a list of business alerts (e.g. low stock, draft transactions, currency mismatch). Reply with one short sentence that summarizes what to look at, in a calm tone. No bullet list.`;

  const userContent = `Alerts:\n${alerts.map((a) => `- ${a.type}: ${a.message}`).join('\n')}\n\nOne sentence summary.`;

  const summary = await chat(systemPrompt, userContent, 80);
  return { summary: summary.trim() };
}
