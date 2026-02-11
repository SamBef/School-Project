# Icons

KoboTrack uses a minimal set of SVG icons (Feather-style, 24×24, stroke-based). All use `currentColor` so they inherit text color. Use with `<img src="/icons/name.svg" alt="" />` or inline in React.

## List

| File | Use |
|------|-----|
| `activity.svg` | Dashboard, summary |
| `file-text.svg` | Receipts, documents |
| `shopping-cart.svg` | Transactions, sales |
| `dollar-sign.svg` | Expenses, revenue, money |
| `download.svg` | Export, download |
| `settings.svg` | Settings, preferences |
| `user.svg` | User profile, account |
| `mail.svg` | Email, invite |
| `lock.svg` | Password, security |
| `menu.svg` | Navigation menu |
| `plus.svg` | Add, create |
| `edit.svg` | Edit, update |
| `trash-2.svg` | Delete, remove |
| `printer.svg` | Print receipt |
| `log-in.svg` | Sign in |
| `log-out.svg` | Sign out |
| `globe.svg` | Language switcher |
| `building.svg` | Business profile |

## Usage

```html
<img src="/icons/activity.svg" alt="" width="24" height="24" />
```

In React, for inline color control, you can import the SVG or use it as img with `className` to set color via CSS (`filter` or wrap in a span with `color`).
