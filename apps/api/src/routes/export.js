/**
 * Export routes — generate PDF and CSV reports for transactions and expenses.
 * Supports date range filtering.
 */

import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Fetch transactions and expenses for a business within a date range.
 */
async function fetchReportData(businessId, dateFrom, dateTo) {
  const txWhere = { businessId };
  const expWhere = { businessId };

  if (dateFrom || dateTo) {
    if (dateFrom) {
      txWhere.createdAt = { ...txWhere.createdAt, gte: new Date(dateFrom) };
      expWhere.date = { ...expWhere.date, gte: new Date(dateFrom) };
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      txWhere.createdAt = { ...txWhere.createdAt, lte: end };
      expWhere.date = { ...expWhere.date, lte: end };
    }
  }

  const [transactions, expenses, business] = await Promise.all([
    prisma.transaction.findMany({
      where: txWhere,
      include: {
        receipt: { select: { receiptNumber: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expense.findMany({
      where: expWhere,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, baseCurrencyCode: true, email: true, phone: true, primaryLocation: true },
    }),
  ]);

  return { transactions, expenses, business };
}

function formatCurrency(amount, currency) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * GET /export/pdf
 * Query: dateFrom, dateTo
 * Owner and Manager only.
 */
router.get(
  '/pdf',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const { transactions, expenses, business } = await fetchReportData(
        req.user.businessId,
        dateFrom,
        dateTo
      );

      const currency = business?.baseCurrencyCode ?? 'USD';
      const dateRange = dateFrom && dateTo
        ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
        : dateFrom
          ? `From ${formatDate(dateFrom)}`
          : dateTo
            ? `Until ${formatDate(dateTo)}`
            : 'All time';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kobotrack-report-${new Date().toISOString().slice(0, 10)}.pdf"`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(business?.name ?? 'KoboTrack Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`${business?.email ?? ''} | ${business?.phone ?? ''} | ${business?.primaryLocation ?? ''}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Report period: ${dateRange}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${formatDate(new Date())}`, { align: 'center' });
      doc.moveDown(1);

      // Summary
      const totalRevenue = transactions.reduce((s, t) => s + Number(t.total), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const netProfit = totalRevenue - totalExpenses;

      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total transactions: ${transactions.length}`);
      doc.text(`Total revenue: ${formatCurrency(totalRevenue, currency)}`);
      doc.text(`Total expenses: ${formatCurrency(totalExpenses, currency)}`);
      doc.text(`Net profit: ${formatCurrency(netProfit, currency)}`);
      doc.moveDown(1);

      // Transactions table
      if (transactions.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Transactions');
        doc.moveDown(0.5);

        // Table header
        const txColX = [50, 110, 280, 370, 470];
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Receipt #', txColX[0], doc.y);
        doc.text('Date', txColX[1], doc.y);
        doc.text('Items', txColX[2], doc.y);
        doc.text('Payment', txColX[3], doc.y);
        doc.text('Total', txColX[4], doc.y);
        doc.moveDown(0.3);

        doc.font('Helvetica').fontSize(9);
        for (const tx of transactions) {
          if (doc.y > 720) {
            doc.addPage();
          }
          const items = Array.isArray(tx.items) ? tx.items : [];
          const itemSummary = items.map((i) => i.name).join(', ').slice(0, 30);
          const y = doc.y;
          doc.text(`#${tx.receipt?.receiptNumber ?? '—'}`, txColX[0], y);
          doc.text(formatDate(tx.createdAt), txColX[1], y);
          doc.text(itemSummary || '—', txColX[2], y);
          doc.text(tx.paymentMethod.replace('_', ' '), txColX[3], y);
          doc.text(formatCurrency(tx.total, currency), txColX[4], y);
          doc.moveDown(0.3);
        }
        doc.moveDown(1);
      }

      // Expenses table
      if (expenses.length > 0) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Expenses');
        doc.moveDown(0.5);

        const expColX = [50, 140, 310, 400, 470];
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Date', expColX[0], doc.y);
        doc.text('Description', expColX[1], doc.y);
        doc.text('Category', expColX[2], doc.y);
        doc.text('Amount', expColX[3], doc.y);
        doc.text('By', expColX[4], doc.y);
        doc.moveDown(0.3);

        doc.font('Helvetica').fontSize(9);
        for (const exp of expenses) {
          if (doc.y > 720) doc.addPage();
          const y = doc.y;
          doc.text(formatDate(exp.date), expColX[0], y);
          doc.text(exp.description.slice(0, 25), expColX[1], y);
          doc.text(exp.category.replace('_', ' '), expColX[2], y);
          doc.text(formatCurrency(exp.amount, currency), expColX[3], y);
          doc.text(exp.user?.email?.split('@')[0] ?? '—', expColX[4], y);
          doc.moveDown(0.3);
        }
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888')
        .text('Generated by KoboTrack — Transaction Tracking & Receipt Automation', { align: 'center' });

      doc.end();
    } catch (err) {
      console.error('export pdf error', err);
      res.status(500).json({ message: 'Failed to generate PDF report.' });
    }
  }
);

/**
 * GET /export/csv
 * Query: dateFrom, dateTo, type (transactions | expenses | all, default: all)
 * Owner and Manager only.
 */
router.get(
  '/csv',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, type = 'all' } = req.query;
      const { transactions, expenses, business } = await fetchReportData(
        req.user.businessId,
        dateFrom,
        dateTo
      );

      const currency = business?.baseCurrencyCode ?? 'USD';
      let csvContent = '';

      if (type === 'all' || type === 'transactions') {
        const txRows = transactions.map((tx) => {
          const items = Array.isArray(tx.items) ? tx.items : [];
          return {
            Type: 'Transaction',
            'Receipt #': tx.receipt?.receiptNumber ?? '',
            Date: formatDate(tx.createdAt),
            Description: items.map((i) => `${i.name} x${i.quantity}`).join('; '),
            Category: '',
            'Payment Method': tx.paymentMethod.replace('_', ' '),
            Amount: `${currency} ${Number(tx.total).toFixed(2)}`,
            'Recorded by': tx.user?.email ?? '',
          };
        });

        if (txRows.length > 0) {
          csvContent += stringify(txRows, { header: true });
        }
      }

      if (type === 'all' || type === 'expenses') {
        const expRows = expenses.map((exp) => ({
          Type: 'Expense',
          'Receipt #': '',
          Date: formatDate(exp.date),
          Description: exp.description,
          Category: exp.category.replace('_', ' '),
          'Payment Method': '',
          Amount: `${currency} ${Number(exp.amount).toFixed(2)}`,
          'Recorded by': exp.user?.email ?? '',
        }));

        if (expRows.length > 0) {
          if (csvContent) csvContent += '\n';
          csvContent += stringify(expRows, { header: !csvContent });
        }
      }

      if (!csvContent) {
        csvContent = 'No data found for the selected period.\n';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kobotrack-report-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csvContent);
    } catch (err) {
      console.error('export csv error', err);
      res.status(500).json({ message: 'Failed to generate CSV report.' });
    }
  }
);

/**
 * GET /export/receipt/:transactionId
 * Generates a PDF receipt for a single transaction.
 * Any authenticated user in the same business.
 */
router.get(
  '/receipt/:transactionId',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.transactionId, businessId: req.user.businessId },
        include: {
          receipt: true,
          user: { select: { email: true } },
        },
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { name: true, baseCurrencyCode: true, email: true, phone: true, primaryLocation: true },
      });

      const currency = business?.baseCurrencyCode ?? 'USD';
      const items = Array.isArray(transaction.items) ? transaction.items : [];

      const doc = new PDFDocument({ margin: 40, size: [280, 600] }); // Thermal-style narrow

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="receipt-${transaction.receipt?.receiptNumber ?? transaction.id}.pdf"`
      );

      doc.pipe(res);

      // Business header
      doc.fontSize(14).font('Helvetica-Bold').text(business?.name ?? 'KoboTrack', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(business?.primaryLocation ?? '', { align: 'center' });
      doc.text(`${business?.phone ?? ''} | ${business?.email ?? ''}`, { align: 'center' });
      doc.moveDown(0.5);

      // Divider
      doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke('#ccc');
      doc.moveDown(0.5);

      // Receipt info
      doc.fontSize(10).font('Helvetica-Bold').text(`Receipt #${transaction.receipt?.receiptNumber ?? '—'}`, { align: 'center' });
      doc.fontSize(8).font('Helvetica');
      doc.text(`Date: ${formatDate(transaction.createdAt)}`, { align: 'center' });
      doc.text(`Payment: ${transaction.paymentMethod.replace('_', ' ')}`, { align: 'center' });
      doc.moveDown(0.5);

      // Divider
      doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke('#ccc');
      doc.moveDown(0.5);

      // Items
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Item', 40, doc.y);
      doc.text('Qty', 140, doc.y);
      doc.text('Price', 170, doc.y);
      doc.text('Total', 210, doc.y);
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(8);
      for (const item of items) {
        const y = doc.y;
        const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0);
        doc.text(item.name?.slice(0, 15) ?? '', 40, y);
        doc.text(String(item.quantity ?? 0), 140, y);
        doc.text(Number(item.unitPrice ?? 0).toFixed(2), 170, y);
        doc.text(lineTotal.toFixed(2), 210, y);
        doc.moveDown(0.2);
      }

      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke('#ccc');
      doc.moveDown(0.3);

      // Total
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(`TOTAL: ${formatCurrency(transaction.total, currency)}`, { align: 'center' });
      doc.moveDown(0.5);

      // Footer
      doc.fontSize(7).font('Helvetica').fillColor('#888');
      doc.text('Thank you for your business!', { align: 'center' });
      doc.text('Powered by KoboTrack', { align: 'center' });

      doc.end();
    } catch (err) {
      console.error('export receipt error', err);
      res.status(500).json({ message: 'Failed to generate receipt.' });
    }
  }
);

export default router;
