const test = require('node:test');
const assert = require('node:assert');
const N = require('../lib/notices.js');

test('first run seeds the Terrorbyte reminder every 2 h of play', () => {
  const n = N.load(null, 1000);
  assert.deepStrictEqual(n.items, []);
  assert.strictEqual(n.reminders.length, 1);
  assert.strictEqual(n.reminders[0].title, 'Conferir o Terrorbyte');
  assert.strictEqual(n.reminders[0].every, 120);
  assert.ok(n.reminders[0].enabled && n.reminders[0].inGame);
});

test('in-game reminders only advance while the timers count', () => {
  const [r] = N.load(null, 1000).reminders;
  assert.deepStrictEqual(N.advance([r], 200, false), []);
  assert.strictEqual(r.elapsed, 0);
  assert.deepStrictEqual(N.advance([r], 119, true), []);
  assert.deepStrictEqual(N.advance([r], 1, true).map(x => x.id), [r.id]);
  assert.strictEqual(r.elapsed, 0);
});

test('real-time reminders advance with the game closed; disabled ones never fire', () => {
  const a = N.sanitizeReminder({ title: 'Pausa', every: 30, inGame: false }, 1);
  const b = N.sanitizeReminder({ title: 'Off', every: 15, enabled: false }, 1);
  assert.deepStrictEqual(N.advance([a, b], 30, false).map(x => x.title), ['Pausa']);
});

test('reminders are validated', () => {
  assert.throws(() => N.sanitizeReminder({ title: '  ' }, 1));
  assert.strictEqual(N.sanitizeReminder({ title: 'x', every: 1 }, 1).every, 5);
  assert.strictEqual(N.sanitizeReminder({ title: 'x', every: 99999 }, 1).every, 1440);
  assert.strictEqual(N.sanitizeReminder({ title: 'x'.repeat(200) }, 1).title.length, 80);
});

test('notices go newest first, are capped and count unread', () => {
  const list = [];
  for (let i = 0; i < 105; i++) N.push(list, { kind: 'warn', title: `n${i}`, page: 'businesses' }, i);
  assert.strictEqual(list.length, 100);
  assert.strictEqual(list[0].title, 'n104');
  assert.strictEqual(N.unread(list), 100);
  list[0].read = true;
  assert.strictEqual(N.unread(list), 99);
  assert.strictEqual(N.push(list, { kind: 'evil', title: 'x', page: 'javascript:' }, 1).page, null);
});

test('saved notices survive a reload and drop junk', () => {
  const saved = { items: [{ id: 'a', kind: 'full', title: 'Cheio', at: 5, read: true }, { title: 3 }], reminders: [{ title: '' }, { id: 'r', title: 'Ok', every: 60, elapsed: 20 }], weekSeen: 'w' };
  const n = N.load(saved, 1);
  assert.strictEqual(n.items.length, 1);
  assert.deepStrictEqual(n.reminders.map(r => [r.id, r.elapsed]), [['r', 20]]);
  assert.strictEqual(n.weekSeen, 'w');
  assert.strictEqual(N.formatEvery(90), '1h30');
});
