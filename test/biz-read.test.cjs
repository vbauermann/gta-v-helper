const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const R = require('../lib/biz-read.js');
const A = require('../lib/biz-apply.js');
const templates = require('../data/biz-read.json');
const catalog = require('../data/businesses.json');

// Fixtures: Vitor's screenshots (3440x1440) scaled to 720 px (MCT) and 1080 px (Nightclub) tall.
function load(name) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures/biz', name)));
  const nl = buf.indexOf(10);
  const [, width, height] = buf.subarray(0, nl).toString().split(' ').map(Number);
  return { data: new Uint8Array(buf.subarray(nl + 1)), width, height, channels: 3 };
}

// Bilinear resize to another height (other screen sizes).
function resize(img, H) {
  const W = Math.round(img.width * H / img.height), k = img.height / H, out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(img.height - 1.001, Math.max(0, (y + 0.5) * k - 0.5)), y0 = Math.floor(fy), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(img.width - 1.001, Math.max(0, (x + 0.5) * k - 0.5)), x0 = Math.floor(fx), tx = fx - x0;
      for (let c = 0; c < 3; c++) {
        const p = (xx, yy) => img.data[(yy * img.width + xx) * 3 + c];
        out[(y * W + x) * 3 + c] = Math.round((p(x0, y0) * (1 - tx) + p(x0 + 1, y0) * tx) * (1 - ty) + (p(x0, y0 + 1) * (1 - tx) + p(x0 + 1, y0 + 1) * tx) * ty);
      }
    }
  }
  return { data: out, width: W, height: H, channels: 3 };
}

const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 0.015, `${msg}: ${a} != ${b}`);

const MCT1 = {
  nightclub: [0.386, null], bunker: [0, 0.415], cocaine: [0.204, 0.123],
  meth: [0, 0], weed: [0.281, 0], cash: [0.654, 0]
};

for (const H of [720, 1080, 1440]) {
  test(`MCT: reads every card of the first page (${H} px, pointer over the bunker bar)`, () => {
    const img = load('mct1.ppm.gz');
    const r = R.read(H === 720 ? img : resize(img, H), templates);
    assert.strictEqual(r.screen, 'mct');
    const cards = byId(r.cards);
    assert.deepStrictEqual(Object.keys(cards).sort(), Object.keys(MCT1).sort());
    for (const [id, [stock, sup]] of Object.entries(MCT1)) {
      near(cards[id].stock, stock, `${id} estoque`);
      if (sup === null) assert.strictEqual(cards[id].supplies, null);
      else near(cards[id].supplies, sup, `${id} suprimentos`);
    }
  });
}

test('MCT: scrolled page reads only cards whose title is visible', () => {
  const r = R.read(load('mct2.ppm.gz'), templates);
  assert.deepStrictEqual(r.cards.map(c => c.id), ['documents']);
  near(r.cards[0].stock, 0.421, 'documentos');
});

test('MCT: other layout and scale (Air-Freight card)', () => {
  const r = R.read(load('mct3.ppm.gz'), templates);
  assert.deepStrictEqual(r.cards.map(c => c.id), ['hangar']);
  near(r.cards[0].stock, 0.224, 'hangar');
});

const GOODS = { cargo: [8, 50], sporting: [35, 100], imports: [10, 10], pharma: [20, 20], organic: [11, 80], printing: [15, 60], cash: [40, 40] };
for (const H of [1080, 1440]) {
  test(`Nightclub Sell Goods: reads units and capacity of the 7 goods (${H} px)`, () => {
    const img = load('nightclub1.ppm.gz');
    const r = R.read(H === 1080 ? img : resize(img, H), templates);
    assert.strictEqual(r.screen, 'nightclub');
    const goods = byId(r.goods);
    assert.deepStrictEqual(Object.keys(goods).sort(), Object.keys(GOODS).sort());
    for (const [id, [units, max]] of Object.entries(GOODS)) assert.deepStrictEqual([goods[id].units, goods[id].max], [units, max], id);
  });
}

test('Nightclub: too small to read the counts safely gives nothing rather than a wrong number', () => {
  const r = R.read(resize(load('nightclub1.ppm.gz'), 720), templates);
  assert.strictEqual(r, null);
});

test('small capture (540 px): reads the MCT and spots the Nightclub page without reading its numbers', () => {
  const mct = R.probe(resize(load('mct1.ppm.gz'), 540), templates);
  assert.strictEqual(mct.screen, 'mct');
  assert.strictEqual(mct.cards.length, 6);
  assert.deepStrictEqual(R.probe(resize(load('nightclub1.ppm.gz'), 540), templates), { screen: 'nightclub', goods: null });
  assert.strictEqual(R.probe(resize(load('open-road.ppm.gz'), 540), templates), null);
});

test('other screens (a business laptop) are not mistaken for the MCT or the Nightclub', () => {
  assert.strictEqual(R.read(load('open-road.ppm.gz'), templates), null);
});

// ---------- applying a reading ----------
const fresh = () => {
  const businesses = {};
  for (const d of catalog.businesses) businesses[d.id] = { owned: false, stock: 0, supplyPct: 0, delivery: null, nightclub: false };
  const stock = {};
  for (const g of catalog.nightclub.goods) stock[g.id] = 0;
  return {
    businesses,
    nightclub: { owned: false, floors: 1, equipment: false, cargo: false, stock, activeMinutes: 0 },
    warehouses: { cargo: [], vehicle: { point: null, cars: 0 } },
    map: { owned: [] }
  };
};

test('MCT reading sets stock and supplies, marks the business as owned and lists the changes', () => {
  const s = fresh();
  s.businesses.cocaine.owned = true;
  s.businesses.cocaine.stock = 2.1; // already right: not reported
  s.businesses.cocaine.supplyPct = 50;
  const { changes } = A.apply(catalog, s, { screen: 'mct', cards: [{ id: 'cocaine', stock: 0.2, supplies: 0.12 }, { id: 'bunker', stock: 0, supplies: 0.4 }, { id: 'hangar', stock: 0.2, supplies: null }] });
  assert.strictEqual(s.businesses.cocaine.supplyPct, 12);
  assert.strictEqual(s.businesses.cocaine.stock, 2.1);
  assert.strictEqual(s.businesses.bunker.owned, true);
  assert.strictEqual(s.businesses.bunker.supplyPct, 40);
  assert.deepStrictEqual(changes.map(c => c.id), ['cocaine', 'bunker']);
  assert.match(changes[0].text, /^suprimentos 12%$/);
});

test('supplies well above the estimate clear a delivery on the way', () => {
  const s = fresh();
  Object.assign(s.businesses.meth, { owned: true, supplyPct: 10, delivery: { at: 8, orderedAt: 0 } });
  A.apply(catalog, s, { screen: 'mct', cards: [{ id: 'meth', stock: 0, supplies: 1 }] });
  assert.strictEqual(s.businesses.meth.delivery, null);
});

test('Nightclub Sell Goods sets each good and the warehouse floors; inconsistent capacity is ignored', () => {
  const s = fresh();
  const goods = Object.entries(GOODS).map(([id, [units, max]]) => ({ id, units, max }));
  goods.push({ id: 'printing', units: 15, max: 80 }); // misread duplicate: 80 is not a printing capacity
  const { changes } = A.apply(catalog, s, { screen: 'nightclub', goods });
  assert.strictEqual(s.nightclub.owned, true);
  assert.strictEqual(s.nightclub.floors, 5);
  assert.deepStrictEqual(s.nightclub.stock, { cargo: 8, sporting: 35, imports: 10, pharma: 20, organic: 11, printing: 15, cash: 40 });
  assert.match(changes[0].text, /5 andares de depósito/);
});

test('MCT Nightclub bar scales the goods to the total it shows', () => {
  const s = fresh();
  Object.assign(s.nightclub, { owned: true, floors: 5 });
  Object.assign(s.nightclub.stock, { sporting: 30, cash: 15 });
  A.apply(catalog, s, { screen: 'mct', cards: [{ id: 'nightclub', stock: 0.25, supplies: null }] });
  // 360 units fit in 5 floors: a quarter is 90, spread 2:1 like before.
  assert.ok(Math.abs(s.nightclub.stock.sporting - 60) < 1e-9);
  assert.ok(Math.abs(s.nightclub.stock.cash - 30) < 1e-9);
});
