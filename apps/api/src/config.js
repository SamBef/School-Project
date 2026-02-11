/**
 * Server configuration loaded from environment variables.
 */

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? '',

  // Gmail / SMTP (preferred for dev)
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',

  // SendGrid (alternative, for production)
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',
};
