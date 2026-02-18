# AI integration plan

KoboTrack can use an LLM (e.g. OpenAI) for optional, user-triggered features. AI is **opt-in**: the app works fully without any API key; features that need AI are hidden or disabled when the key is not set.

---

## Principles

- **No AI required** — App runs without `OPENAI_API_KEY`; AI features are additive.
- **User-triggered only** — No background AI; user taps "Suggest category" or similar.
- **Clear feedback** — Loading state, errors, and fallback (e.g. "Suggest category unavailable") are explicit.
- **Semantic and calm** — Labels and errors follow the Security & UX doctrines (no jargon, no infinite spinners).

---

## Phase 1: Expense category suggestion (first feature)

**Value:** User types an expense description (e.g. "Electricity bill January"); AI suggests one of the existing categories: `RENT`, `STOCK_INVENTORY`, `UTILITIES`, `TRANSPORT`, `MISCELLANEOUS`.

**Backend:**

- Config: `OPENAI_API_KEY` (optional). If missing, AI routes return 503 or a clear "not configured" response.
- Service: `apps/api/src/services/ai.js` — single function `suggestExpenseCategory(description)` → `{ category }` or throws.
- Route: `POST /ai/suggest-expense-category` — body `{ description }`; auth + Owner/Manager only; returns `{ category }` or 503/429/500 with a clear message.

**Frontend:**

- Expense form: "Suggest category" button (only shown or only enabled when the app knows AI is available, or always shown and we show "Unavailable" when the API returns 503).
- On success: set category dropdown to the suggested value; user can change it.
- Loading: button shows spinner and is disabled; no infinite wait (e.g. timeout 10s).
- Error: inline message, e.g. "Could not suggest category. Please choose manually."

**Deployment:** Set `OPENAI_API_KEY` in production if you want the feature; otherwise the button can call the API and show "Suggest category unavailable" on 503.

---

## Phase 2 (later)

- **Dashboard insights** — Short natural-language summary, e.g. "Expenses up 10% vs last month; utilities drove the increase." Optional endpoint + small "Insights" block on dashboard.
- **Transaction line suggestions** — From a short description, suggest line item name/quantity/price (more complex; needs structured output).
- **Receipt parsing** — Upload image, extract line items (OCR + LLM). Requires file upload and vision API.

---

## Tech choices

- **Provider:** OpenAI API (e.g. `gpt-4o-mini` or `gpt-3.5-turbo`) for low cost and good instruction-following. Can abstract behind a small `ai.js` so we can swap provider later.
- **Prompt:** Strict instruction: "Given this expense description, return exactly one of: RENT, STOCK_INVENTORY, UTILITIES, TRANSPORT, MISCELLANEOUS. Reply with only the category."

---

## Security and privacy

- Descriptions are sent to the AI provider; no PII beyond what the user types. Document in privacy notice if required.
- Rate limit: consider a per-user or per-business limit on AI endpoints (e.g. 20 requests/minute) to avoid abuse and cost spikes.
- Do not log full descriptions in production; log only "AI suggest called" and status.
