# Inventory Management

Inventory is integrated with the existing sales (transactions) system: real-time stock, reservations on draft sales, deduction on confirm, low-stock alerts, suppliers, receive/returns/adjustments, and reporting.

## Setup

1. **Run migration** (when DB is available):
   ```bash
   cd apps/api && npx prisma migrate dev --name add_inventory
   npx prisma generate
   ```

2. **Seed optional data** (via API or UI):
   - Create **Units** (e.g. Piece, Box, Kg) under Inventory → Units.
   - Create **Locations** (e.g. Main Store, Warehouse). Set one as default (used as default sell-from location).
   - Create **Products** (name, optional SKU, primary unit, optional min stock, optional alternate units with factors).
   - Create **Return reasons** (e.g. DEFECTIVE, WRONG_ITEM) for processing returns.
   - Add **Suppliers** and link them to products (which supplier supplies which product).

3. **Initial stock**: Use **Receive stock** to record incoming stock (location, supplier, lines with product + quantity). Stock levels are created or updated per product/location.

## Concepts

- **Legacy transactions**: Existing transactions (no `productId` in items) are unchanged and marked as legacy (no `locationId`, `status` CONFIRMED). They do not affect stock.
- **New transactions**: Items must include `productId`; `locationId` is required. **DRAFT** reserves stock; **CONFIRMED** deducts stock and creates a receipt.
- **Returns**: Full or partial; each line has condition (RESTOCK or DISCARD) and a return reason. RESTOCK adds quantity back at the transaction’s location.
- **Alerts**: Low-stock uses per-product `minStock` and/or business `globalMinStock`. Alerts are available to all roles with inventory access (Cashier, Manager, Owner); high-level alerts can be restricted later.

## API

- **Mount**: `/inventory`
- **Units**: `GET/POST /inventory/units`, `PATCH/DELETE /inventory/units/:id`
- **Locations**: `GET/POST /inventory/locations`, `PATCH/DELETE /inventory/locations/:id`
- **Products**: `GET/POST /inventory/products`, `GET/PATCH/DELETE /inventory/products/:id`
- **Stock levels**: `GET /inventory/stock-levels?locationId=&productId=`
- **Low-stock alerts**: `GET /inventory/alerts/low-stock`
- **Return reasons**: `GET/POST /inventory/return-reasons`, `PATCH/DELETE /inventory/return-reasons/:id`
- **Returns**: `POST /inventory/returns`, `GET /inventory/returns`
- **Suppliers**: `GET/POST /inventory/suppliers`, `PATCH/DELETE /inventory/suppliers/:id`, `POST /inventory/suppliers/:id/products`, `DELETE /inventory/suppliers/:id/products/:productId`
- **Receive stock**: `POST /inventory/receive`, `GET /inventory/receive`
- **Adjustments**: `POST /inventory/adjustments`
- **Movement report**: `GET /inventory/reports/movements?productId=&locationId=&type=`

**Transactions** (existing route):

- `POST /transactions` — Body may include `status` (DRAFT | CONFIRMED) and `locationId`; items may include `productId` (and `unitId` for alternate unit). Legacy: no `productId` → CONFIRMED, no receipt change.
- `POST /transactions/:id/confirm` — Confirm a DRAFT: deduct stock, create receipt.
- `POST /transactions/:id/cancel` — Cancel a DRAFT: release reservation, set CANCELLED.

## Roles

- **Cashier**: Create sales (draft/confirm), view stock levels and low-stock alerts.
- **Manager**: All of the above + locations, units, products, return reasons, suppliers, receive, adjustments, returns, reports.
- **Owner**: Full access; sets default location and global/min stock rules.

## Performance

- Indexes on `StockLevel(productId, locationId)`, `Transaction(businessId, status)`, `StockMovement(productId, createdAt)` and `(businessId, type)`.
- List endpoints use pagination (`limit`, `offset`).
- Reserve/deduct/confirm/cancel run inside Prisma `$transaction` to avoid race conditions.
