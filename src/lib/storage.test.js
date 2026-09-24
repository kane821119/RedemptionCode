import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReportThreshold } from './storage.js';

test('uses custom memory when present', () => {
  assert.equal(resolveReportThreshold({ storedValue: 7, fallback: 10 }), 7);
});

test('keeps an intentionally chosen value of 20 as a custom setting', () => {
  assert.equal(resolveReportThreshold({ storedValue: 20, fallback: 10 }), 20);
});

test('defaults to 10 when no local memory exists', () => {
  assert.equal(resolveReportThreshold({ storedValue: null, fallback: 10 }), 10);
});
