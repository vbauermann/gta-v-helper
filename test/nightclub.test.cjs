const test = require('node:test');
const assert = require('node:assert');
const NC = require('../lib/nightclub.js');
const catalog = require('../data/businesses.json');
const cfg = catalog.nightclub;

const state = (extra = {}) => ({
  nightclub: { owned: true, floors: 5, equipment: true, cargo: false, stock: {}, activeMinutes: 0, ...extra.nightclub },
  warehouses: { cargo: [], vehicle: { point: null, cars: 0 }, ...extra.warehouses },
  businesses: { cocaine: { owned: true, nightclub: true }, bunker: { owned: true, nightclub: false }, meth: { owned: false, nightclub: true }, ...extra.businesses }
});

test('full Nightclub warehouse (5 floors) is worth GTA$ 1.93 mi', () => {
  assert.strictEqual(NC.project(cfg, state(), 0).maxValue, 1931500);
});

test('only owned and linked businesses have a technician; cargo needs a warehouse', () => {
  assert.deepStrictEqual([...NC.linked(cfg, state())], ['imports']);
  assert.deepStrictEqual([...NC.linked(cfg, state({ nightclub: { cargo: true } }))], ['imports']);
  const withWh = state({ nightclub: { cargo: true }, warehouses: { cargo: [{ point: 'w', crates: 0 }] } });
  assert.deepStrictEqual([...NC.linked(cfg, withWh)].sort(), ['cargo', 'imports']);
  const withHangar = { ...state({ nightclub: { cargo: true } }), map: { owned: ['hangar-2'] } };
  assert.deepStrictEqual([...NC.linked(cfg, withHangar)].sort(), ['cargo', 'imports']);
});

test('technicians produce one unit per interval, twice as slow without equipment, up to the floors capacity', () => {
  const s = state();
  assert.strictEqual(NC.project(cfg, s, 240).goods.find(g => g.id === 'imports').stock, 2);
  s.nightclub.equipment = false;
  assert.strictEqual(NC.project(cfg, s, 240).goods.find(g => g.id === 'imports').stock, 1);
  s.nightclub.floors = 1;
  const p = NC.project(cfg, s, 100000);
  assert.strictEqual(p.goods.find(g => g.id === 'imports').stock, 2);
  assert.ok(p.full);
});

test('rebase folds the online minutes into the stock', () => {
  const s = state({ nightclub: { activeMinutes: 120 } });
  NC.rebase(cfg, s);
  assert.strictEqual(s.nightclub.activeMinutes, 0);
  assert.strictEqual(s.nightclub.stock.imports, 1);
});

test('special cargo sale value grows per crate with the amount', () => {
  assert.strictEqual(NC.cargoValue(catalog.cargo.sale, 0), 0);
  assert.strictEqual(NC.cargoValue(catalog.cargo.sale, 1), catalog.cargo.sale[0][1]);
  assert.ok(NC.cargoValue(catalog.cargo.sale, 111) / 111 > NC.cargoValue(catalog.cargo.sale, 5) / 5);
});
