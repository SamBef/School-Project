/**
 * Inventory routes — units, locations, products, stock, returns, suppliers, receive, adjustments, alerts, reports.
 * Mount at /inventory. All routes require auth. Role checks per endpoint.
 */

import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as stockService from '../../services/stock.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function toNum(d) {
  return d == null ? null : Number(d);
}

// —— Units (GET: all authenticated; POST/PATCH/DELETE: Owner, Manager) ——
router.get(
  '/units',
  wrap(requireAuth),
  async (req, res) => {
    const list = await prisma.unit.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
    });
    res.json({ units: list });
  }
);

router.post(
  '/units',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { name, symbol } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Unit name is required.' });
    }
    const unit = await prisma.unit.create({
      data: {
        businessId: req.user.businessId,
        name: name.trim(),
        symbol: symbol?.trim() || null,
      },
    });
    res.status(201).json(unit);
  }
);

router.patch(
  '/units/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.unit.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Unit not found.' });
    const { name, symbol } = req.body || {};
    const unit = await prisma.unit.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(symbol !== undefined && { symbol: symbol?.trim() || null }),
      },
    });
    res.json(unit);
  }
);

router.delete(
  '/units/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.unit.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Unit not found.' });
    await prisma.unit.delete({ where: { id: existing.id } });
    res.json({ message: 'Unit deleted.' });
  }
);

// —— Locations (Owner, Manager) ——
router.get(
  '/locations',
  wrap(requireAuth),
  async (req, res) => {
    const list = await prisma.location.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
    });
    res.json({ locations: list });
  }
);

router.post(
  '/locations',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { name, address, isDefault } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Location name is required.' });
    }
    const tx = await prisma.$transaction(async (t) => {
      if (isDefault) {
        await t.location.updateMany({
          where: { businessId: req.user.businessId },
          data: { isDefault: false },
        });
      }
      const location = await t.location.create({
        data: {
          businessId: req.user.businessId,
          name: name.trim(),
          address: address?.trim() || null,
          isDefault: !!isDefault,
        },
      });
      if (isDefault) {
        await t.business.update({
          where: { id: req.user.businessId },
          data: { defaultLocationId: location.id },
        });
      }
      return location;
    });
    res.status(201).json(tx);
  }
);

router.patch(
  '/locations/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.location.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Location not found.' });
    const { name, address, isDefault } = req.body || {};
    const tx = await prisma.$transaction(async (t) => {
      if (isDefault) {
        await t.location.updateMany({
          where: { businessId: req.user.businessId },
          data: { isDefault: false },
        });
        await t.business.update({
          where: { id: req.user.businessId },
          data: { defaultLocationId: existing.id },
        });
      }
      return t.location.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(isDefault !== undefined && { isDefault: !!isDefault }),
        },
      });
    });
    res.json(tx);
  }
);

router.delete(
  '/locations/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.location.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Location not found.' });
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { defaultLocationId: true },
    });
    if (business?.defaultLocationId === existing.id) {
      await prisma.business.update({
        where: { id: req.user.businessId },
        data: { defaultLocationId: null },
      });
    }
    await prisma.location.delete({ where: { id: existing.id } });
    res.json({ message: 'Location deleted.' });
  }
);

// —— Products (Owner, Manager) ——
router.get(
  '/products',
  wrap(requireAuth),
  async (req, res) => {
    const { limit = '50', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = parseInt(offset, 10) || 0;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { businessId: req.user.businessId },
        include: {
          primaryUnit: { select: { id: true, name: true, symbol: true } },
          alternateUnits: { include: { unit: { select: { id: true, name: true, symbol: true } } } },
        },
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      prisma.product.count({ where: { businessId: req.user.businessId } }),
    ]);
    res.json({
      products: products.map((p) => ({
        ...p,
        minStock: toNum(p.minStock),
      })),
      total,
      limit: take,
      offset: skip,
    });
  }
);

router.post(
  '/products',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { name, sku, primaryUnitId, minStock, alternateUnits } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ message: 'Product name is required.' });
    if (!primaryUnitId) return res.status(400).json({ message: 'Primary unit is required.' });
    const unit = await prisma.unit.findFirst({
      where: { id: primaryUnitId, businessId: req.user.businessId },
    });
    if (!unit) return res.status(400).json({ message: 'Invalid primary unit.' });
    const product = await prisma.product.create({
      data: {
        businessId: req.user.businessId,
        name: name.trim(),
        sku: sku?.trim() || null,
        primaryUnitId,
        minStock: minStock != null ? minStock : null,
      },
    });
    if (Array.isArray(alternateUnits) && alternateUnits.length > 0) {
      for (const au of alternateUnits) {
        if (au.unitId && au.factor != null) {
          await prisma.productUnit.create({
            data: {
              productId: product.id,
              unitId: au.unitId,
              factor: au.factor,
            },
          });
        }
      }
    }
    const created = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        primaryUnit: { select: { id: true, name: true, symbol: true } },
        alternateUnits: { include: { unit: { select: { id: true, name: true, symbol: true } } } },
      },
    });
    res.status(201).json({ ...created, minStock: toNum(created.minStock) });
  }
);

router.get(
  '/products/:id',
  wrap(requireAuth),
  async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        primaryUnit: { select: { id: true, name: true, symbol: true } },
        alternateUnits: { include: { unit: { select: { id: true, name: true, symbol: true } } } },
      },
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ ...product, minStock: toNum(product.minStock) });
  }
);

router.patch(
  '/products/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found.' });
    const { name, sku, primaryUnitId, minStock } = req.body || {};
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(sku !== undefined && { sku: sku?.trim() || null }),
        ...(primaryUnitId !== undefined && { primaryUnitId }),
        ...(minStock !== undefined && { minStock: minStock == null ? null : minStock }),
      },
      include: {
        primaryUnit: { select: { id: true, name: true, symbol: true } },
        alternateUnits: { include: { unit: { select: { id: true, name: true, symbol: true } } } },
      },
    });
    res.json({ ...product, minStock: toNum(product.minStock) });
  }
);

router.delete(
  '/products/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found.' });
    await prisma.product.delete({ where: { id: existing.id } });
    res.json({ message: 'Product deleted.' });
  }
);

// —— Set initial stock for a product (Owner, Manager) — creates movement type INITIAL_STOCK ——
router.post(
  '/products/:id/initial-stock',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const productId = req.params.id;
    const { locationId, quantity } = req.body || {};
    if (!locationId || quantity == null || quantity < 0) {
      return res.status(400).json({ message: 'Location and non-negative quantity are required.' });
    }
    const qty = Number(quantity);
    const [product, location] = await Promise.all([
      prisma.product.findFirst({ where: { id: productId, businessId: req.user.businessId } }),
      prisma.location.findFirst({ where: { id: locationId, businessId: req.user.businessId } }),
    ]);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!location) return res.status(404).json({ message: 'Location not found.' });

    await prisma.$transaction(async (t) => {
      const level = await t.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });
      if (level) {
        await t.stockLevel.update({
          where: { productId_locationId: { productId, locationId } },
          data: { quantity: { increment: qty } },
        });
      } else {
        await t.stockLevel.create({
          data: { productId, locationId, quantity: qty, reservedQuantity: 0 },
        });
      }
      await t.stockMovement.create({
        data: {
          businessId: req.user.businessId,
          productId,
          locationId,
          quantityDelta: qty,
          type: 'INITIAL_STOCK',
          referenceType: 'product',
          referenceId: productId,
          userId: req.user.id,
        },
      });
    });
    const level = await prisma.stockLevel.findUnique({
      where: { productId_locationId: { productId, locationId } },
      include: { product: { select: { name: true } }, location: { select: { name: true } } },
    });
    res.status(201).json(level);
  }
);

// —— Stock levels (all roles that can use inventory) ——
router.get(
  '/stock-levels',
  wrap(requireAuth),
  async (req, res) => {
    const { locationId, productId } = req.query;
    const where = { product: { businessId: req.user.businessId } };
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;
    const levels = await prisma.stockLevel.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, minStock: true, primaryUnitId: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { location: { name: 'asc' } }],
    });
    res.json({
      stockLevels: levels.map((l) => ({
        ...l,
        quantity: toNum(l.quantity),
        reservedQuantity: toNum(l.reservedQuantity),
        available: Math.max(0, Number(l.quantity) - Number(l.reservedQuantity)),
        product: { ...l.product, minStock: toNum(l.product.minStock) },
      })),
    });
  }
);

// —— Low-stock alerts (all roles with inventory access) ——
router.get(
  '/alerts/low-stock',
  wrap(requireAuth),
  async (req, res) => {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { globalMinStock: true },
    });
    const globalMin = business?.globalMinStock != null ? Number(business.globalMinStock) : null;
    const levels = await prisma.stockLevel.findMany({
      where: { product: { businessId: req.user.businessId } },
      include: {
        product: { select: { id: true, name: true, sku: true, minStock: true } },
        location: { select: { id: true, name: true } },
      },
    });
    const alerts = [];
    for (const l of levels) {
      const available = Number(l.quantity) - Number(l.reservedQuantity);
      const threshold = l.product.minStock != null ? Number(l.product.minStock) : globalMin;
      if (threshold != null && available < threshold) {
        alerts.push({
          productId: l.productId,
          productName: l.product.name,
          sku: l.product.sku,
          locationId: l.locationId,
          locationName: l.location.name,
          available,
          threshold,
          quantity: toNum(l.quantity),
          reservedQuantity: toNum(l.reservedQuantity),
        });
      }
    }
    res.json({ alerts });
  }
);

// —— Return reasons (Owner, Manager) ——
router.get(
  '/return-reasons',
  wrap(requireAuth),
  async (req, res) => {
    const list = await prisma.returnReason.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { label: 'asc' },
    });
    res.json({ returnReasons: list });
  }
);

router.post(
  '/return-reasons',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { code, label } = req.body || {};
    if (!code?.trim() || !label?.trim()) {
      return res.status(400).json({ message: 'Code and label are required.' });
    }
    const reason = await prisma.returnReason.create({
      data: {
        businessId: req.user.businessId,
        code: code.trim(),
        label: label.trim(),
      },
    });
    res.status(201).json(reason);
  }
);

router.patch(
  '/return-reasons/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.returnReason.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Return reason not found.' });
    const { code, label } = req.body || {};
    const reason = await prisma.returnReason.update({
      where: { id: existing.id },
      data: {
        ...(code !== undefined && { code: code.trim() }),
        ...(label !== undefined && { label: label.trim() }),
      },
    });
    res.json(reason);
  }
);

router.delete(
  '/return-reasons/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.returnReason.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Return reason not found.' });
    await prisma.returnReason.delete({ where: { id: existing.id } });
    res.json({ message: 'Return reason deleted.' });
  }
);

// —— Returns (create: Manager, Owner; list/get: all) ——
router.post(
  '/returns',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { transactionId, lines } = req.body || {};
    if (!transactionId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: 'Transaction ID and at least one return line are required.' });
    }
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, businessId: req.user.businessId },
      include: { location: true },
    });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    const locationId = transaction.locationId;
    if (!locationId) return res.status(400).json({ message: 'Transaction has no location (legacy). Cannot process return.' });

    const result = await prisma.$transaction(async (t) => {
      const ret = await t.return.create({
        data: {
          businessId: req.user.businessId,
          transactionId,
          userId: req.user.id,
        },
      });
      for (const line of lines) {
        const { productId, returnReasonId, quantity, condition } = line;
        if (!productId || !returnReasonId || quantity == null || quantity <= 0 || !['RESTOCK', 'DISCARD'].includes(condition)) {
          throw new Error('Each line must have productId, returnReasonId, positive quantity, and condition RESTOCK or DISCARD.');
        }
        await t.returnLine.create({
          data: {
            returnId: ret.id,
            productId,
            returnReasonId,
            quantity,
            condition,
          },
        });
        if (condition === 'RESTOCK') {
          const level = await t.stockLevel.findUnique({
            where: { productId_locationId: { productId, locationId } },
          });
          if (level) {
            await t.stockLevel.update({
              where: { productId_locationId: { productId, locationId } },
              data: { quantity: { increment: quantity } },
            });
          } else {
            await t.stockLevel.create({
              data: { productId, locationId, quantity, reservedQuantity: 0 },
            });
          }
          await t.stockMovement.create({
            data: {
              businessId: req.user.businessId,
              productId,
              locationId,
              quantityDelta: quantity,
              type: 'RETURN_RESTOCK',
              referenceType: 'return',
              referenceId: ret.id,
              userId: req.user.id,
            },
          });
        } else {
          await t.stockMovement.create({
            data: {
              businessId: req.user.businessId,
              productId,
              locationId,
              quantityDelta: 0,
              type: 'RETURN_DISCARD',
              referenceType: 'return',
              referenceId: ret.id,
              userId: req.user.id,
            },
          });
        }
      }
      return ret;
    });

    const created = await prisma.return.findUnique({
      where: { id: result.id },
      include: { lines: { include: { returnReason: true } } },
    });
    res.status(201).json(created);
  }
);

router.get(
  '/returns',
  wrap(requireAuth),
  async (req, res) => {
    const { limit = '50', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = parseInt(offset, 10) || 0;
    const [list, total] = await Promise.all([
      prisma.return.findMany({
        where: { businessId: req.user.businessId },
        include: {
          transaction: { select: { id: true, createdAt: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
          lines: { include: { returnReason: true } },
        },
        orderBy: { processedAt: 'desc' },
        take,
        skip,
      }),
      prisma.return.count({ where: { businessId: req.user.businessId } }),
    ]);
    res.json({ returns: list, total, limit: take, offset: skip });
  }
);

// —— Suppliers (Owner, Manager) ——
router.get(
  '/suppliers',
  wrap(requireAuth),
  async (req, res) => {
    const list = await prisma.supplier.findMany({
      where: { businessId: req.user.businessId },
      include: { products: { include: { product: { select: { id: true, name: true, sku: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json({ suppliers: list });
  }
);

router.post(
  '/suppliers',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { name, contactPhone, contactEmail, address } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ message: 'Supplier name is required.' });
    const supplier = await prisma.supplier.create({
      data: {
        businessId: req.user.businessId,
        name: name.trim(),
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        address: address?.trim() || null,
      },
    });
    res.status(201).json(supplier);
  }
);

router.patch(
  '/suppliers/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Supplier not found.' });
    const { name, contactPhone, contactEmail, address } = req.body || {};
    const supplier = await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
      },
    });
    res.json(supplier);
  }
);

router.delete(
  '/suppliers/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Supplier not found.' });
    await prisma.supplier.delete({ where: { id: existing.id } });
    res.json({ message: 'Supplier deleted.' });
  }
);

// Link supplier to product
router.post(
  '/suppliers/:supplierId/products',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { supplierId } = req.params;
    const { productId } = req.body || {};
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: req.user.businessId },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId: req.user.businessId },
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    const link = await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      create: { supplierId, productId },
      update: {},
    });
    res.status(201).json(link);
  }
);

router.delete(
  '/suppliers/:supplierId/products/:productId',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { supplierId, productId } = req.params;
    const existing = await prisma.supplierProduct.findFirst({
      where: { supplierId, productId },
    });
    if (!existing) return res.status(404).json({ message: 'Link not found.' });
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: req.user.businessId },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    await prisma.supplierProduct.delete({
      where: { supplierId_productId: { supplierId, productId } },
    });
    res.json({ message: 'Unlinked.' });
  }
);

// —— Receive stock (Owner, Manager) ——
router.post(
  '/receive',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { locationId, supplierId, notes, lines } = req.body || {};
    if (!locationId || !supplierId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: 'Location, supplier, and at least one line are required.' });
    }
    const [location, supplier] = await Promise.all([
      prisma.location.findFirst({ where: { id: locationId, businessId: req.user.businessId } }),
      prisma.supplier.findFirst({ where: { id: supplierId, businessId: req.user.businessId } }),
    ]);
    if (!location) return res.status(404).json({ message: 'Location not found.' });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

    const result = await prisma.$transaction(async (t) => {
      const rec = await t.receiveStock.create({
        data: {
          businessId: req.user.businessId,
          locationId,
          supplierId,
          userId: req.user.id,
          notes: notes?.trim() || null,
        },
      });
      for (const line of lines) {
        const { productId, quantity, unitId } = line;
        if (!productId || quantity == null || quantity <= 0) continue;
        const product = await t.product.findFirst({
          where: { id: productId, businessId: req.user.businessId },
          include: { alternateUnits: true },
        });
        if (!product) continue;
        let qtyPrimary = Number(quantity);
        if (unitId) {
          const pu = await t.productUnit.findFirst({
            where: { productId, unitId },
          });
          if (pu) qtyPrimary *= Number(pu.factor);
        }
        await t.receiveStockLine.create({
          data: { receiveId: rec.id, productId, quantity: qtyPrimary, unitId: unitId || null },
        });
        const level = await t.stockLevel.findUnique({
          where: { productId_locationId: { productId, locationId } },
        });
        if (level) {
          await t.stockLevel.update({
            where: { productId_locationId: { productId, locationId } },
            data: { quantity: { increment: qtyPrimary } },
          });
        } else {
          await t.stockLevel.create({
            data: { productId, locationId, quantity: qtyPrimary, reservedQuantity: 0 },
          });
        }
        await t.stockMovement.create({
          data: {
            businessId: req.user.businessId,
            productId,
            locationId,
            quantityDelta: qtyPrimary,
            type: 'RECEIVE',
            referenceType: 'receive',
            referenceId: rec.id,
            userId: req.user.id,
          },
        });
      }
      return rec;
    });

    const created = await prisma.receiveStock.findUnique({
      where: { id: result.id },
      include: {
        location: true,
        supplier: true,
        lines: { include: { product: true } },
      },
    });
    res.status(201).json(created);
  }
);

router.get(
  '/receive',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { limit = '50', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = parseInt(offset, 10) || 0;
    const [list, total] = await Promise.all([
      prisma.receiveStock.findMany({
        where: { businessId: req.user.businessId },
        include: {
          location: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
          lines: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { receivedAt: 'desc' },
        take,
        skip,
      }),
      prisma.receiveStock.count({ where: { businessId: req.user.businessId } }),
    ]);
    res.json({ receiveHistory: list, total, limit: take, offset: skip });
  }
);

// —— Stock adjustments (list: all; create: Owner, Manager) ——
router.get(
  '/adjustments',
  wrap(requireAuth),
  async (req, res) => {
    const { limit = '50', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = parseInt(offset, 10) || 0;
    const [list, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where: { businessId: req.user.businessId },
        include: {
          location: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.stockAdjustment.count({ where: { businessId: req.user.businessId } }),
    ]);
    res.json({
      adjustments: list.map((a) => ({ ...a, quantityDelta: toNum(a.quantityDelta) })),
      total,
      limit: take,
      offset: skip,
    });
  }
);

router.post(
  '/adjustments',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    const { locationId, productId, quantityDelta, reason, notes } = req.body || {};
    if (!locationId || !productId || quantityDelta == null || !['DAMAGE', 'LOSS', 'COUNT_CORRECTION', 'OTHER'].includes(reason)) {
      return res.status(400).json({ message: 'Location, product, quantity delta, and reason (DAMAGE|LOSS|COUNT_CORRECTION|OTHER) are required.' });
    }
    const delta = Number(quantityDelta);
    const [location, product] = await Promise.all([
      prisma.location.findFirst({ where: { id: locationId, businessId: req.user.businessId } }),
      prisma.product.findFirst({ where: { id: productId, businessId: req.user.businessId } }),
    ]);
    if (!location) return res.status(404).json({ message: 'Location not found.' });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const adjustment = await prisma.$transaction(async (t) => {
      const adj = await t.stockAdjustment.create({
        data: {
          businessId: req.user.businessId,
          locationId,
          productId,
          userId: req.user.id,
          quantityDelta: delta,
          reason,
          notes: notes?.trim() || null,
        },
      });
      const level = await t.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });
      if (level) {
        const current = Number(level.quantity);
        const reserved = Number(level.reservedQuantity);
        const newQty = current + delta;
        if (newQty < reserved) {
          throw new Error('Adjustment would result in available stock below reserved. Reduce the adjustment.');
        }
        if (newQty < 0) {
          throw new Error('Adjustment would result in negative stock. Reduce the adjustment or correct the reason.');
        }
        await t.stockLevel.update({
          where: { productId_locationId: { productId, locationId } },
          data: { quantity: newQty },
        });
      } else if (delta > 0) {
        await t.stockLevel.create({
          data: { productId, locationId, quantity: delta, reservedQuantity: 0 },
        });
      } else {
        throw new Error('Cannot apply negative adjustment: no stock level exists.');
      }
      await t.stockMovement.create({
        data: {
          businessId: req.user.businessId,
          productId,
          locationId,
          quantityDelta: delta,
          type: 'ADJUSTMENT',
          referenceType: 'adjustment',
          referenceId: adj.id,
          userId: req.user.id,
        },
      });
      return adj;
    });

    const created = await prisma.stockAdjustment.findUnique({
      where: { id: adjustment.id },
      include: {
        location: true,
        product: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    res.status(201).json(created);
  }
);

// —— Reports: movement history ——
router.get(
  '/reports/movements',
  wrap(requireAuth),
  async (req, res) => {
    const { productId, locationId, type, limit = '100', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 100, 500);
    const skip = parseInt(offset, 10) || 0;
    const where = { businessId: req.user.businessId };
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;
    if (type) where.type = type;
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({
      movements: movements.map((m) => ({ ...m, quantityDelta: toNum(m.quantityDelta) })),
      total,
      limit: take,
      offset: skip,
    });
  }
);

export default router;
