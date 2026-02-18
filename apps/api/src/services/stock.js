/**
 * Stock service — reserve on draft, deduct on confirm, release on cancel.
 * All mutations run inside Prisma transactions for consistency and no race conditions.
 */

import { prisma } from '../lib/prisma.js';

/**
 * Get available quantity (quantity - reservedQuantity) for a product at a location.
 * Returns a number.
 */
export async function getAvailableQuantity(productId, locationId, tx = prisma) {
  const level = await tx.stockLevel.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { quantity: true, reservedQuantity: true },
  });
  if (!level) return 0;
  return Math.max(0, Number(level.quantity) - Number(level.reservedQuantity));
}

/**
 * Reserve stock for a DRAFT transaction. Fails if any product has insufficient available stock.
 * @param {string} businessId
 * @param {string} locationId
 * @param {Array<{ productId: string, quantity: number }>} lines - quantities in product primary unit
 * @param {string} transactionId - draft transaction id (for reference only; we don't store it on StockLevel)
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} tx
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export async function reserveStock(businessId, locationId, lines, transactionId, tx = prisma) {
  for (const line of lines) {
    const available = await getAvailableQuantity(line.productId, locationId, tx);
    if (available < line.quantity) {
      const product = await tx.product.findFirst({
        where: { id: line.productId, businessId },
        select: { name: true },
      });
      return {
        ok: false,
        message: `Insufficient stock for ${product?.name ?? 'product'}. Available: ${available}, requested: ${line.quantity}.`,
      };
    }
  }

  for (const line of lines) {
    await tx.stockLevel.update({
      where: { productId_locationId: { productId: line.productId, locationId } },
      data: {
        reservedQuantity: { increment: line.quantity },
      },
    });
  }
  return { ok: true };
}

/**
 * Release reservation for a draft (cancel). Decreases reservedQuantity only.
 */
export async function releaseReservation(businessId, locationId, lines, tx = prisma) {
  for (const line of lines) {
    await tx.stockLevel.updateMany({
      where: { productId: line.productId, locationId },
      data: {
        reservedQuantity: { decrement: line.quantity },
      },
    });
  }
}

/**
 * Confirm a draft: deduct quantity and reservedQuantity, record SALE movements.
 * Call after updating transaction status to CONFIRMED and setting confirmedAt.
 */
export async function confirmAndDeduct(businessId, locationId, lines, transactionId, userId, tx = prisma) {
  for (const line of lines) {
    const level = await tx.stockLevel.findUnique({
      where: { productId_locationId: { productId: line.productId, locationId } },
    });
    if (!level) {
      throw new Error(`Stock level not found for product ${line.productId} at location ${locationId}`);
    }
    const qty = Number(level.quantity);
    const reserved = Number(level.reservedQuantity);
    if (reserved < line.quantity) {
      throw new Error(`Reservation mismatch for product ${line.productId}`);
    }
    const newQty = qty - line.quantity;
    const newReserved = reserved - line.quantity;
    await tx.stockLevel.update({
      where: { productId_locationId: { productId: line.productId, locationId } },
      data: {
        quantity: newQty,
        reservedQuantity: newReserved,
      },
    });
    await tx.stockMovement.create({
      data: {
        businessId,
        productId: line.productId,
        locationId,
        quantityDelta: -line.quantity,
        type: 'SALE',
        referenceType: 'transaction',
        referenceId: transactionId,
        userId,
      },
    });
  }
}

/**
 * Parse transaction items into { productId, quantity } lines (primary unit).
 * Only includes items that have productId. Converts quantity to primary unit if unitId provided (using ProductUnit factor).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function getLinesInPrimaryUnit(businessId, items, tx = prisma) {
  const lines = [];
  for (const item of items) {
    if (!item.productId) continue;
    let qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity);
    if (item.unitId) {
      const pu = await tx.productUnit.findFirst({
        where: { productId: item.productId, unitId: item.unitId },
        select: { factor: true },
      });
      if (pu) qty *= Number(pu.factor);
    }
    if (qty <= 0) continue;
    lines.push({ productId: item.productId, quantity: qty });
  }
  return lines;
}
