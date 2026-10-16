const test = require('node:test');
const assert = require('node:assert');
const K = require('../lib/hotkeys.js');

test('valida combinações de atalho', () => {
  assert.ok(K.isValid('Ctrl+Shift+F'));
  assert.ok(K.isValid('Alt+num5'));
  assert.ok(K.isValid('F8'));
  assert.ok(!K.isValid('F'), 'letra sem modificador');
  assert.ok(!K.isValid('Shift+Ctrl+F'), 'ordem dos modificadores');
  assert.ok(!K.isValid('Ctrl+Ctrl+F'));
  assert.ok(!K.isValid('Ctrl+Shift'));
});

test('monta atalho a partir da tecla apertada', () => {
  assert.strictEqual(K.fromEvent({ code: 'KeyG', ctrlKey: true, altKey: true }), 'Ctrl+Alt+G');
  assert.strictEqual(K.fromEvent({ code: 'Numpad3', shiftKey: true }), 'Shift+num3');
  assert.strictEqual(K.fromEvent({ code: 'F9' }), 'F9');
  assert.strictEqual(K.fromEvent({ code: 'KeyG' }), null);
  assert.strictEqual(K.fromEvent({ code: 'ShiftLeft', shiftKey: true }), null);
});

test('mescla salvos com padrão e acha repetidos', () => {
  const keys = K.normalize({ toggle: 'F8', S: 'nada', J: 'F8' });
  assert.strictEqual(keys.toggle, 'F8');
  assert.strictEqual(keys.S, K.DEFAULT_KEYS.S);
  assert.deepStrictEqual(K.duplicates(keys).sort(), ['J', 'toggle']);
});
