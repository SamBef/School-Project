# SME Intelligence Layer

AI-powered strategic and operational insights for the business management platform. The AI has read access to **inventory data, sales history, analytics metrics, and the business's registered location.**

---

## Principles

- **Opt-in** — All AI features work only when `OPENAI_API_KEY` is set; otherwise the UI shows "Unavailable" or hides the action.
- **User-triggered** — Insights are generated when the user requests them (e.g. "Generate insights"); no background polling.
- **Data-grounded** — Every recommendation ties back to a specific data point or framework; tone is professional and concise.
- **Location-aware** — Business `primaryLocation` (and address) is used as default where relevant and is passed to AI for geo-contextualized insights.

---

## 1. Competitive Intelligence & Market Awareness

Using the business's **inventory, product names, and location**, the AI produces strategic insights using:

- **Porter's Five Forces** — competitive rivalry, supplier power, buyer power, threat of substitution, threat of new entrants.
- **SWOT** — Strengths, Weaknesses, Opportunities, Threats.
- **Other frameworks** where relevant (e.g. PESTLE for macro factors, BCG-style product prioritization).

Insights are **actionable recommendations** surfaced on the Dashboard, with each insight **labeled by framework** (e.g. "Porter's Five Forces", "SWOT").

**Implementation:** `POST /ai/insights/strategic` — backend gathers business location and product list, calls LLM with a structured prompt, returns markdown or structured bullets. Dashboard shows a "Strategic insights" block with a "Generate insights" button.

---

## 2. Location Awareness

- **Default location** — The business's registered `primaryLocation` (city/town) and optional `address` are stored on the Business model. They are returned in auth (login, me, set-password) and used wherever the platform needs a location input.
- **Pre-fill** — Any form that asks for location or address (e.g. supplier address, future competitor search, delivery zones, tax settings) **defaults** to the business location; the value remains **user-editable**.
- **Geo-context for AI** — All AI-driven insights (competitive analysis, market trends, restocking) receive the business's current location so recommendations are geo-contextualized (e.g. "In Accra, demand for X often peaks in …").

**Implementation:** Auth and business APIs already return `primaryLocation` and `address`. Forms that add location/address fields use this as initial value. AI prompts include `primaryLocation` and optionally `address`.

---

## 3. Analytics Integration & Restocking Intelligence

The AI is deeply integrated with **Analytics** (time-series revenue/expenses, transaction counts) and **inventory/sales data**:

- **Data used:** Sales velocity (from transactions and stock movements), stock levels and min-stock thresholds, revenue per product over a selectable time range, seasonal patterns where visible in the data.
- **Recommendations:**
  - **Restock urgently** — Items low or below threshold with high sell-through; suggested quantities where inferable.
  - **Underperformers** — Items with low sales or low margin; consider discount or discontinue.
  - **Optimal reorder timing** — Based on historical sell-through and current stock.
  - **High-margin opportunities** — Products or segments worth prioritizing.

Recommendations are presented with **clear reasoning**, **supporting data** (e.g. "Sold 45 units in 30 days; 12 left"), and **confidence** where useful. The AI acts as a **strategic business advisor**, not just a data reader.

**Implementation:**  
- `GET /analysis/inventory-metrics?dateFrom=&dateTo=` — Returns per-product: quantity sold, revenue, current stock, minStock, product name.  
- `POST /ai/insights/restocking` — Body: `{ dateFrom, dateTo }`. Backend fetches inventory metrics and business location, calls LLM with strict prompt; returns structured list (e.g. restock, underperform, reorder timing, high-margin) with reasoning and data.  
- Analysis page: "Restocking & product insights" section with "Generate insights" button; displays results with framework/data labels.

---

## API keys (all AI features)

A single key powers all AI features:

- **OpenAI** — Used for expense category suggestion, strategic insights, and restocking insights.  
  Get an API key: [OpenAI API Keys](https://platform.openai.com/api-keys).  
  Set in the API environment: `OPENAI_API_KEY=sk-...` (e.g. in `apps/api/.env` for local dev).  
  Do not commit the key; use env vars in production.

No other AI provider keys are required for the current feature set.

---

## Security and privacy

- Only aggregated or non-PII data is sent to the AI (e.g. product names, location name, totals). Avoid sending raw PII in prompts.
- Rate limiting on AI endpoints (e.g. per user or per business) is recommended to control cost and abuse.
- Log "AI insight requested" and status, not full prompt or response content, in production.
