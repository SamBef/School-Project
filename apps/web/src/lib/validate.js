/**
 * Client-side validation utilities.
 * Catches obvious typos before hitting the server.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password) {
  return password.length >= 8;
}
