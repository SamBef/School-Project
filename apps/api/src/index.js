import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import exportRoutes from './routes/export.js';
import businessRoutes from './routes/business.js';
import analysisRoutes from './routes/analysis.js';
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
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kobotrack-api' });
});

app.use('/auth', asyncHandler(authRoutes));
app.use('/users', asyncHandler(userRoutes));
app.use('/transactions', asyncHandler(transactionRoutes));
app.use('/expenses', asyncHandler(expenseRoutes));
app.use('/dashboard', asyncHandler(dashboardRoutes));
app.use('/export', asyncHandler(exportRoutes));
app.use('/business', asyncHandler(businessRoutes));
app.use('/analysis', asyncHandler(analysisRoutes));
app.use('/admin', asyncHandler(adminRoutes));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const MAX_PORT_ATTEMPTS = 11; // 3000..3010

function startServer(portToTry, attempt = 0) {
  if (attempt >= MAX_PORT_ATTEMPTS) {
    console.error('No available port in range 3000–3010. Stop other processes or set PORT.');
    process.exit(1);
  }
  const server = app.listen(portToTry, () => {
    console.log(`KoboTrack API listening on port ${portToTry}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${portToTry} in use, trying ${portToTry + 1}`);
      startServer(portToTry + 1, attempt + 1);
    } else {
      throw err;
    }
  });
}

startServer(port);
