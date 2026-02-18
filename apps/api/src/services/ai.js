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
