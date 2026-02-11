/**
 * Unit tests for client-side validation (Phase 6).
 * Run with: npm run test (from apps/web).
 */
import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword } from './validate.js';

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('owner@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('nodomain@')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

describe('isValidPassword', () => {
  it('accepts passwords with at least 8 characters', () => {
    expect(isValidPassword('password')).toBe(true);
    expect(isValidPassword('longerpassword')).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(isValidPassword('')).toBe(false);
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('7chars!')).toBe(false);
  });
});
