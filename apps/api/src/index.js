import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: apiEnvPath, override: true });
import './lib/db-env.js';

// Log uncaught errors so "failed running src/index.js" shows the real cause
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at', promise, 'reason:', reason);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import exportRoutes from './routes/export.js';
import businessRoutes from './routes/business.js';
import analysisRoutes from './routes/analysis.js';
import inventoryRoutes from './routes/inventory/index.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin/index.js';

const app = express();
const port = config.port;

/**
 * Wrap async middleware so rejected promises are passed to next(err).
 * Express 4 does not catch async errors by default.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const corsOrigins = [config.frontendUrl, config.adminFrontendUrl].filter(Boolean);
if (corsOrigins.length) {
  console.log('CORS allowed origins:', corsOrigins.join(', '));
} else {
  console.warn('CORS: no FRONTEND_URL or ADMIN_FRONTEND_URL set; allowing all origins');
}
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  const koboaiConfigured = Boolean(config.openaiApiKey && config.openaiApiKey.trim().length > 0);
  res.json({ status: 'ok', service: 'kobotrack-api', koboaiConfigured });
});

app.use('/auth', asyncHandler(authRoutes));
app.use('/users', asyncHandler(userRoutes));
app.use('/transactions', asyncHandler(transactionRoutes));
app.use('/expenses', asyncHandler(expenseRoutes));
app.use('/dashboard', asyncHandler(dashboardRoutes));
app.use('/export', asyncHandler(exportRoutes));
app.use('/business', asyncHandler(businessRoutes));
app.use('/analysis', asyncHandler(analysisRoutes));
app.use('/inventory', asyncHandler(inventoryRoutes));
app.use('/ai', asyncHandler(aiRoutes));
app.use('/admin', asyncHandler(adminRoutes));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    const koboaiOk = Boolean(config.openaiApiKey && config.openaiApiKey.trim().length > 0);
    console.log(`KoboTrack API listening on port ${portToUse}`);
    console.log(`KoboAI configured: ${koboaiOk ? 'yes' : 'no'}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${portToUse} is in use. Stop the process using it, or set PORT to another value (e.g. in apps/api/.env).`);
      process.exit(1);
    }
    throw err;
  });
}

startServer(port);
