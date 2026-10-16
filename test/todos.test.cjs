const test = require('node:test');
const assert = require('node:assert');
const T = require('../lib/todos.js');

const weekly = T.weeklyAnchor('2026-10-22T10:00:00Z');

test('weekly anchor comes from the bundled reset time', () => {
  assert.deepStrictEqual(weekly, { day: 4, hour: 10 });
});

test('weekly period starts on the last Thursday 10:00 UTC', () => {
  const at = Date.UTC(2026, 9, 16, 22); // Friday
  assert.strictEqual(T.periodStart('weekly', at, { weekly }), Date.UTC(2026, 9, 15, 10));
  assert.strictEqual(T.nextReset('weekly', at, { weekly }), Date.UTC(2026, 9, 22, 10));
  const thuEarly = Date.UTC(2026, 9, 22, 9, 59);
  assert.strictEqual(T.periodStart('weekly', thuEarly, { weekly }), Date.UTC(2026, 9, 15, 10));
  assert.strictEqual(T.periodStart('weekly', Date.UTC(2026, 9, 22, 10), { weekly }), Date.UTC(2026, 9, 22, 10));
});

test('daily period starts at the chosen local hour', () => {
  const at = new Date(2026, 9, 16, 5, 30).getTime();
  assert.strictEqual(T.periodStart('daily', at, { dailyHour: 6 }), new Date(2026, 9, 15, 6).getTime());
  assert.strictEqual(T.nextReset('daily', at, { dailyHour: 6 }), new Date(2026, 9, 16, 6).getTime());
  const later = new Date(2026, 9, 16, 6, 0).getTime();
  assert.strictEqual(T.periodStart('daily', later, { dailyHour: 6 }), later);
});

test('done only inside the current period', () => {
  const now = Date.UTC(2026, 9, 16, 22);
  const item = { period: 'weekly', doneAt: Date.UTC(2026, 9, 15, 11) };
  assert.ok(T.isDone(item, now, { weekly }));
  assert.ok(!T.isDone(item, Date.UTC(2026, 9, 22, 10), { weekly }));
  assert.ok(!T.isDone({ period: 'daily', doneAt: null }, now, {}));
});

test('sanitize keeps only known fields and rejects junk', () => {
  const now = 1000;
  const t = T.sanitize({ title: '  Dr. Dre  ', period: 'weekly', key: 'dre', evil: 1, expiresAt: 5000 }, now);
  assert.deepStrictEqual(t, { id: 'dre', key: 'dre', title: 'Dr. Dre', note: '', period: 'weekly', doneAt: null, expiresAt: 5000 });
  assert.throws(() => T.sanitize({ title: '', period: 'daily' }, now));
  assert.throws(() => T.sanitize({ title: 'x', period: 'monthly' }, now));
  assert.strictEqual(T.sanitize({ title: 'x', period: 'daily', key: '<b>' }, now).key, null);
});

test('first run has the starter tasks, all from the catalog', () => {
  const list = T.firstRun();
  assert.strictEqual(list.length, 10);
  assert.ok(list.every(i => T.suggestion(i.key)));
  assert.deepStrictEqual(list.filter(i => i.period === 'weekly').map(i => i.key), ['casino', 'clucking', 'dre', 'fib']);
});
