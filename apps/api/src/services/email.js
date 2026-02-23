/**
 * Email service — supports Gmail (Nodemailer) and SendGrid.
 * Gmail is recommended for development; SendGrid for production.
 *
 * Priority: if SMTP_USER is set, use Gmail/Nodemailer. Otherwise, try SendGrid.
 * If neither is configured, emails are skipped and a warning is logged.
 */

import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.smtpUser && config.smtpPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
    return transporter;
  }

  return null;
}

function getFromEmail() {
  return config.smtpUser || config.sendgridFromEmail || 'noreply@example.com';
}

function isEmailConfigured() {
  return !!(config.smtpUser && config.smtpPass) || !!config.sendgridApiKey;
}

async function sendMail({ to, subject, text, html }) {
  // Try Nodemailer (Gmail) first
  const transport = getTransporter();
  if (transport) {
    await transport.sendMail({
      from: `KoboTrack <${getFromEmail()}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to} via Gmail/SMTP`);
    return true;
  }

  // Fall back to SendGrid
  if (config.sendgridApiKey) {
    const { default: sgMail } = await import('@sendgrid/mail');
    sgMail.setApiKey(config.sendgridApiKey);
    await sgMail.send({
      to,
      from: getFromEmail(),
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to} via SendGrid`);
    return true;
  }

  console.warn(`Email not configured; skipping email to ${to}`);
  return false;
}

/**
 * Send verification/invite email to a new worker.
 * The link is the primary way to verify and set password; owner can share the same link as backup if email is delayed.
 */
export async function sendInviteEmail(toEmail, businessName, setPasswordLink) {
  if (!isEmailConfigured()) {
    console.warn('Email not configured; skipping invite email to', toEmail);
    return false;
  }

  return sendMail({
    to: toEmail,
    subject: `Verify your account — ${businessName} on KoboTrack`,
    text: `You have been invited to join ${businessName} on KoboTrack. Verify your account and set your password:\n\n${setPasswordLink}\n\nIf the link does not open, copy and paste it into your browser. If you did not expect this email, you can ignore it.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #171717; margin: 0 0 16px;">Verify your account</h2>
        <p style="color: #525252; line-height: 1.6;">
          You have been invited to join <strong>${escapeHtml(businessName)}</strong> on KoboTrack. Click below to verify your account and set your password.
        </p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(setPasswordLink)}" 
             style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Verify and set password
          </a>
        </p>
        <p style="color: #737373; font-size: 14px;">If the link does not open (e.g. due to network or server delay), copy and paste this link into your browser: ${escapeHtml(setPasswordLink)}</p>
        <p style="color: #a3a3a3; font-size: 14px;">If you did not expect this email, you can ignore it.</p>
      </div>
    `,
  });
}

/**
 * Send welcome email after a user has set their password and joined the app.
 */
export async function sendWelcomeEmail(toEmail, firstName) {
  if (!isEmailConfigured()) {
    console.warn('Email not configured; skipping welcome email to', toEmail);
    return false;
  }

  const name = firstName?.trim() || 'there';
  return sendMail({
    to: toEmail,
    subject: 'Welcome to KoboTrack',
    text: `Hi ${name},\n\nWelcome to KoboTrack. You can now sign in to record sales, track expenses, and manage your business in one place.\n\nIf you have any questions, reach out to your team owner.\n\n— The KoboTrack team`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #171717; margin: 0 0 16px;">Welcome to KoboTrack</h2>
        <p style="color: #525252; line-height: 1.6;">
          Hi ${escapeHtml(name)},
        </p>
        <p style="color: #525252; line-height: 1.6;">
          You're all set. You can now sign in to record sales, track expenses, and manage your business in one place.
        </p>
        <p style="color: #737373; font-size: 14px;">If you have any questions, reach out to your team owner.</p>
        <p style="color: #a3a3a3; font-size: 14px;">— The KoboTrack team</p>
      </div>
    `,
  });
}

/**
 * Send password-reset email.
 */
export async function sendPasswordResetEmail(toEmail, resetLink) {
  if (!isEmailConfigured()) {
    console.warn('Email not configured; skipping password-reset email to', toEmail);
    return false;
  }

  return sendMail({
    to: toEmail,
    subject: 'Reset your KoboTrack password',
    text: `You requested a password reset for your KoboTrack account.\n\nReset your password: ${resetLink}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #171717; margin: 0 0 16px;">Reset your password</h2>
        <p style="color: #525252; line-height: 1.6;">
          You requested a password reset for your KoboTrack account.
        </p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(resetLink)}" 
             style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Reset password
          </a>
        </p>
        <p style="color: #a3a3a3; font-size: 14px;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
