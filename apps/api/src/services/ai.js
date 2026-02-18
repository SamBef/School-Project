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

  const prompt = `Given this expense description, reply with exactly one of these words: RENT, STOCK_INVENTORY, UTILITIES, TRANSPORT, MISCELLANEOUS. Reply with only that single word, nothing else.

Expense description: ${description}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
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
  const systemPrompt = `You are a strategic business advisor for an SME. You receive inventory and sales data for a selectable period. Your task is to produce concise, actionable insights.

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
  const systemPrompt = `You are a strategic business advisor for an SME. You receive the business's location and list of products (or product categories). There is no external market database: base your analysis on general knowledge of similar businesses in that geography and sector.

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
