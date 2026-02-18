/**
 * Server configuration loaded from environment variables.
 * Load .env from api package so JWT_SECRET and others are set regardless of cwd.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiEnvPath = path.resolve(__dirname, '..', '.env');
const candidatePaths = [
  apiEnvPath,
  path.join(process.cwd(), 'apps', 'api', '.env'),
  path.join(process.cwd(), '.env'),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    break;
  }
}

// If dotenv didn't load OPENAI_API_KEY (e.g. long line or parsing quirk), read file and extract it
if (!(process.env.OPENAI_API_KEY ?? '').trim()) {
  for (const p of candidatePaths) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, 'utf8');
      // Capture rest of line (dotenv can fail on very long or special values)
      const lineMatch = raw.match(/OPENAI_API_KEY\s*=\s*([^\r\n]+)/);
      if (lineMatch && lineMatch[1]) {
        const value = lineMatch[1].replace(/^["']|["']$/g, '').trim();
        if (value.length > 10) {
          process.env.OPENAI_API_KEY = value;
          break;
        }
      }
    } catch {
      // ignore read errors
    }
  }
}

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
