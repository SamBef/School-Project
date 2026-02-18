/**
 * Sanity tests for config and app bootstrap.
 * Phase 6 — run with: npm run test (from apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { config } from './config.js';

describe('config', () => {
  it('exposes port as a number', () => {
    assert.strictEqual(typeof config.port, 'number');
    assert(config.port >= 1 && config.port <= 65535);
  });

  it('exposes frontendUrl as a string', () => {
    assert.strictEqual(typeof config.frontendUrl, 'string');
    assert(config.frontendUrl.length > 0);
  });

  it('exposes jwtSecret as a string', () => {
    assert.strictEqual(typeof config.jwtSecret, 'string');
  });
});
