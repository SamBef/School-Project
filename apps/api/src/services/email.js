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
 * Send invite email to a new worker.
 */
export async function sendInviteEmail(toEmail, businessName, setPasswordLink) {
  if (!isEmailConfigured()) {
    console.warn('Email not configured; skipping invite email to', toEmail);
    return false;
  }

  return sendMail({
    to: toEmail,
    subject: `You're invited to join ${businessName} on KoboTrack`,
    text: `You have been invited to join ${businessName} on KoboTrack.\n\nSet your password to get started: ${setPasswordLink}\n\nIf you did not expect this email, you can ignore it.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #171717; margin: 0 0 16px;">You're invited to KoboTrack</h2>
        <p style="color: #525252; line-height: 1.6;">
          You have been invited to join <strong>${escapeHtml(businessName)}</strong> on KoboTrack.
        </p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(setPasswordLink)}" 
             style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Set your password
          </a>
        </p>
        <p style="color: #a3a3a3; font-size: 14px;">If you did not expect this email, you can ignore it.</p>
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
