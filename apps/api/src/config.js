/**
 * Server configuration loaded from environment variables.
 * Load .env from api package so JWT_SECRET and others are set regardless of cwd.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

export const config = {
  port: parseInt(process.env.PORT ?? '3003', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL ?? 'http://localhost:5174', // admin app origin for CORS
  jwtSecret: process.env.JWT_SECRET ?? '',

  // Gmail / SMTP (preferred for dev)
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',

  // SendGrid (alternative, for production)
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',

  // AI (optional) — e.g. OpenAI for suggest-expense-category (trimmed so no newline breaks it)
  openaiApiKey: (process.env.OPENAI_API_KEY ?? '').trim(),
};
