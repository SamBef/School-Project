# Products page (Inventory → Products) — audit

## What it has (current)

- **Add product form:** Name, SKU (with description), Primary unit (grouped dropdown + hint), Min stock, Initial quantity, Location for initial stock, Save.
- **Product list table:** Name, SKU, Units, Threshold. No actions, no link to detail or stock.
- **Loading / error / empty** states.

---

## Unnecessary or could trim

| Item | Notes |
|------|--------|
| **Two unit hints** | When units exist, both "Add units first" (hidden) and "primaryUnitHint" show. One contextual hint is enough. |
| **Long SKU description** | "A unique code or reference for this product (e.g. RICE-1KG). Optional." — could shorten to "Unique code (optional)." if you want a leaner form. |
| **Initial quantity + location** | Useful for quick setup; some teams may prefer adding stock only via "Receive stock." Optional to keep or move to an "Advanced" section. |
| **Unit optgroups** | "Primary" vs "Other units" improves scanability; for very few units it’s optional. |

---

## What it needs (missing)

| Need | Priority | API support |
|------|----------|-------------|
| **Edit product** | High | Yes — `PATCH /inventory/products/:id` |
| **Delete product** | High | Yes — `DELETE /inventory/products/:id` |
| **Actions column** | High | — |
| **Search / filter** | Medium | Can filter client-side or add `?search=` to GET products |
| **Current stock in table** | Medium | Would need stock-levels aggregated by product or a new endpoint |
| **Link to stock per product** | Low | Stock page could accept `?productId=` to filter |
| **Pagination** | Low | List uses limit 200; add pagination if list grows |
| **Alternate units (e.g. 1 box = 12 pc)** | Low | API supports `alternateUnits` on create; form doesn’t expose it |

---

## Recommended next steps

1. Add **Edit** and **Delete** with an **Actions** column (edit modal or inline; delete with confirmation).
2. Expose **updateProduct** and **deleteProduct** in the API client.
3. Optionally shorten the unit hint to a single line and keep one hint per field.
