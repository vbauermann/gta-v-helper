const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { setOwned, forgetBusiness } = require('../lib/ls-map.js');

const map = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ls-map.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/businesses.json'), 'utf8'));

test('dados do mapa: pontos dentro da imagem, ids únicos, categorias e ícones existem', () => {
  const cats = new Set(map.groups.flatMap(g => g.categories.map(c => c.id)));
  const ids = new Set();
  for (const p of map.points) {
    assert.ok(cats.has(p.category), p.id);
    assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1, p.id);
    assert.ok(!ids.has(p.id), p.id);
    ids.add(p.id);
  }
  for (const c of map.groups.flatMap(g => g.categories)) {
    assert.ok(fs.existsSync(path.join(__dirname, '../app', c.icon)), c.icon);
    if (c.business) assert.ok(c.business === 'nightclub' || catalog.businesses.some(b => b.id === c.business), c.business);
  }
  for (const img of map.images) assert.ok(fs.existsSync(path.join(__dirname, '../app', img.src)), img.src);
  // Every garage shows its name on hover.
  assert.ok(map.points.filter(p => p.category === 'garage').every(p => p.name));
});

test('marcar um negócio do MC troca o local e liga o negócio', () => {
  let r = setOwned(map, [], 'mc-cocaine-1', true);
  assert.deepStrictEqual(r, { owned: ['mc-cocaine-1'], business: { id: 'cocaine', owned: true } });
  r = setOwned(map, r.owned, 'mc-cocaine-3', true);
  assert.deepStrictEqual(r.owned, ['mc-cocaine-3']);
  r = setOwned(map, r.owned, 'mc-cocaine-3', false);
  assert.deepStrictEqual(r, { owned: [], business: { id: 'cocaine', owned: false } });
});

test('garagens não têm limite, mansões até 3', () => {
  let owned = [];
  for (const id of ['garage-1', 'garage-2', 'garage-3']) owned = setOwned(map, owned, id, true).owned;
  assert.strictEqual(owned.length, 3);
  for (const id of ['mansion-1', 'mansion-2', 'mansion-3']) owned = setOwned(map, owned, id, true).owned;
  assert.strictEqual(owned.length, 6);
  assert.strictEqual(setOwned(map, owned, 'garage-1', true).owned.length, 6);
});

test('recusa animais e ids desconhecidos; desmarcar na tela de Negócios limpa o local', () => {
  assert.throws(() => setOwned(map, [], 'animal-deer-1', true));
  assert.throws(() => setOwned(map, [], 'nada', true));
  assert.deepStrictEqual(forgetBusiness(map, ['bunker-2', 'garage-1'], 'bunker'), ['garage-1']);
});

test('warehouses: 22 de cargo com tamanho (até 5) e 10 de veículos (1)', () => {
  const cats = new Map(map.groups.flatMap(g => g.categories).map(c => [c.id, c]));
  const cargo = map.points.filter(p => p.category === 'warehouse');
  assert.strictEqual(cargo.length, 22);
  assert.ok(cargo.every(p => ['small', 'medium', 'large'].includes(p.size)));
  assert.strictEqual(map.points.filter(p => p.category === 'vehicle-warehouse').length, 10);
  assert.strictEqual(cats.get('warehouse').owns, 5);
  assert.strictEqual(cats.get('vehicle-warehouse').owns, 1);
});
