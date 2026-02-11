# Receipt formats

KoboTrack offers selectable receipt formats so users get the right layout for their use case. Labels and descriptions are shown in the UI so users understand what they are choosing.

---

## Format options

| Format ID   | Label (EN)        | Description (EN) |
|------------|-------------------|------------------|
| `standard` | Standard receipt  | Full A4/letter layout with business name, address, items, totals, and receipt number. Best for filing or customer copies. |
| `thermal`  | Thermal / till    | Compact, narrow layout suitable for thermal (POS) printers. Fewer lines, same key info: business name, items, total, receipt number. |

Labels and descriptions will be translated for French and Spanish in the i18n files.

---

## Implementation

- Stored on each receipt as `format` (string).
- Default: `standard`.
- User selects format when generating or printing a receipt (or once per business in settings — TBD).
- PDF/print output uses the chosen format to render the receipt.
