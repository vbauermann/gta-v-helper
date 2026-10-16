const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

// weekly-feed.cjs needs electron's net only when fetching; stub it for the pure helpers.
const load = Module._load;
Module._load = (req, ...rest) => (req === 'electron' ? { net: {} } : load(req, ...rest));
const { validWeekly, newer } = require('../weekly-feed.cjs');
Module._load = load;
const bundled = require('../data/weekly.json');

test('the bundled week is valid', () => {
  assert.ok(validWeekly(bundled));
});

test('rejects broken or incomplete weeks', () => {
  assert.ok(!validWeekly(null));
  assert.ok(!validWeekly({ ...bundled, start: '15/10' }));
  assert.ok(!validWeekly({ ...bundled, bonuses: [] }));
  assert.ok(!validWeekly({ ...bundled, discounts: [{ pct: '40', items: [] }] }));
  assert.ok(!validWeekly({ ...bundled, vehicles: { ...bundled.vehicles, podium: null } }));
});

test('only a later week replaces the current one', () => {
  const next = { ...bundled, start: '2026-10-22', end: '2026-10-28', resetUtc: '2026-10-29T10:00:00Z' };
  assert.strictEqual(newer(bundled, next), next);
  assert.strictEqual(newer(next, bundled), next);
  assert.strictEqual(newer(bundled, { ...next, bonuses: 'x' }), bundled);
});
