const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const F = require('../lib/features.js');
const { createStore } = require('../store.cjs');

const LIST = [{ id: 'a', title: 'A', description: '' }, { id: 'b', title: 'B', description: '' }];

test('recursos opcionais vêm desligados e só guardam os que existem', () => {
  assert.deepEqual(F.normalize(undefined, LIST), { a: false, b: false });
  assert.deepEqual(F.normalize({ a: true, b: 'sim', gone: true }, LIST), { a: true, b: false });
});

test('a chave só aceita recurso conhecido com valor booleano', () => {
  assert.deepEqual(F.sanitizePatch({ b: true }, LIST), { b: true });
  assert.throws(() => F.sanitizePatch({ c: true }, LIST));
  assert.throws(() => F.sanitizePatch({ a: 1 }, LIST));
  assert.throws(() => F.sanitizePatch([true], LIST));
  assert.throws(() => F.sanitizePatch(null, LIST));
});

test('isOn lê a escolha salva nos ajustes', () => {
  assert.equal(F.isOn({ features: { a: true } }, 'a'), true);
  assert.equal(F.isOn({ features: { a: false } }, 'a'), false);
  assert.equal(F.isOn({}, 'a'), false);
});

test('o estado salvo descarta recursos que saíram do catálogo', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/businesses.json'), 'utf8'));
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gta-')), 'data.json');
  fs.writeFileSync(file, JSON.stringify({ settings: { features: { 'nao-existe': true } } }));
  const s = createStore(file, catalog).get();
  assert.deepEqual(s.settings.features, F.normalize({}));
  assert.equal(F.isOn(s.settings, 'nao-existe'), false);
});
