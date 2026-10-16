const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const P = require('../lib/production.js');
const H = require('../lib/heists.js');
const { advance } = require('../timers.cjs');
const { parseTasklist } = require('../game-watcher.cjs');
const { createStore } = require('../store.cjs');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/businesses.json'), 'utf8'));
const heists = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/heists.json'), 'utf8'));
const def = id => catalog.businesses.find(b => b.id === id);
const biz = patch => ({ upgrades: {}, calibration: {}, supplyPct: 100, stock: 0, ...patch });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('upgrades change speed and how long a supply bar lasts', () => {
  const none = P.rates(def('cocaine'), {});
  const full = P.rates(def('cocaine'), { equipment: true, staff: true });
  assert.equal(none.minutesPerUnit, 50);
  assert.equal(full.minutesPerUnit, 30);
  assert.equal(full.barMinutes, 120);
  assert.equal(P.rates(def('bunker'), {}).barMinutes, 100); // 1h40 sem upgrades
  assert.equal(P.rates(def('bunker'), { equipment: true, staff: true }).barMinutes, 140); // 2h20
  assert.equal(P.tier(def('acid'), { staff: true }), 'none'); // Acid Lab não tem upgrade de funcionários
});

test('supply runs out before stock fills', () => {
  const d = def('cocaine');
  const b = biz({ upgrades: { equipment: true, staff: true } });
  const start = P.project(d, b, 0);
  assert.equal(start.stopsOn, 'supply');
  close(start.minutesToSupplyEmpty, 120);
  const mid = P.project(d, b, 60);
  close(mid.supplyPct, 50);
  close(mid.stock, 2);
  const end = P.project(d, b, 500);
  assert.equal(end.producing, false);
  close(end.supplyPct, 0);
  close(end.stock, 4);
});

test('production stops when stock is full and keeps the leftover supply', () => {
  const d = def('cocaine');
  const b = biz({ upgrades: { equipment: true, staff: true }, stock: 9 });
  const p = P.project(d, b, 0);
  assert.equal(p.stopsOn, 'capacity');
  close(p.minutesToFull, 30);
  const after = P.project(d, b, 90);
  close(after.stock, 10);
  close(after.supplyPct, 75);
});

test('calibration overrides the bar duration', () => {
  const r = P.rates(def('meth'), { equipment: true, staff: true }, { barMinutes: 180 });
  close(r.barMinutes, 180);
  close(r.unitsPerBar, 10);
});

test('timers advance only owned businesses and alert once', () => {
  const state = {
    settings: { warnMinutes: 10 },
    businesses: Object.fromEntries(catalog.businesses.map(d => [d.id, {
      owned: d.id === 'cocaine', upgrades: { equipment: true, staff: true }, calibration: {},
      supplyPct: 100, stock: 0, activeMinutes: 0, alerts: { warned: false, empty: false, full: false }
    }]))
  };
  assert.deepEqual(advance(state, catalog, 100), []);
  const warn = advance(state, catalog, 11);
  assert.deepEqual(warn.map(a => a.kind), ['warn']);
  assert.deepEqual(advance(state, catalog, 1), []);
  assert.deepEqual(advance(state, catalog, 20).map(a => a.kind), ['empty']);
  assert.deepEqual(advance(state, catalog, 20), []);
  assert.equal(state.businesses.meth.activeMinutes, 0);
});

test('detects GTA in the Windows process list', () => {
  assert.equal(parseTasklist('"explorer.exe","1","Console","1","10 K"\r\n"GTA5_Enhanced.exe","2","Console","1","9 K"'), true);
  assert.equal(parseTasklist('"GTA5.exe","2","Console","1","9 K"'), true);
  assert.equal(parseTasklist('"PlayGTAV.exe","2","Console","1","9 K"'), false);
});

test('store persists and rebase folds production into the snapshot', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gta-')), 'data.json');
  const store = createStore(file, catalog);
  const s = store.get();
  Object.assign(s.businesses.cocaine, { owned: true, upgrades: { equipment: true, staff: true, security: false }, supplyPct: 100, activeMinutes: 60 });
  store.rebase('cocaine');
  close(s.businesses.cocaine.supplyPct, 50);
  close(s.businesses.cocaine.stock, 2);
  assert.equal(s.businesses.cocaine.activeMinutes, 0);
  store.save();
  const again = createStore(file, catalog).get();
  close(again.businesses.cocaine.stock, 2);
  assert.equal(again.settings.detection, 'auto');
});

test('Cayo bag plan prefers gold, skips it solo, and never splits a painting', () => {
  const S = heists.cayo.secondaries;
  const duo = H.planBags(S, { gold: 2, cocaine: 4, cash: 2 }, 2);
  assert.deepEqual(duo.picks.map(p => p.id), ['gold', 'cocaine']);
  close(duo.picks[0].stacks, 2);
  assert.ok(Math.abs(duo.usedPct - 200) < 1e-6);
  const solo = H.planBags(S, { gold: 3, paintings: 3, cash: 2 }, 1);
  assert.deepEqual(solo.skipped, ['gold']);
  assert.deepEqual(solo.picks.map(p => [p.id, p.stacks]), [['paintings', 2]]);
  const odd = H.planBags(S, { cocaine: 1, paintings: 2 }, 1);
  assert.deepEqual(odd.picks.map(p => [p.id, p.stacks]), [['cocaine', 1], ['paintings', 1]]);
});

test('Cayo payout applies hard mode, fees and cuts', () => {
  const r = H.cayo(heists.cayo, { primaryId: 'diamond', hard: true, crewSize: 1, cuts: [100], found: {}, safe: 0, elite: true });
  close(r.primaryValue, 1001000);
  close(r.net, 1001000 * 0.88);
  close(r.players[0].value, 1001000 * 0.88 + 100000);
  assert.equal(r.cooldownMinutes, 144);
});

test('Casino payout applies weekly bonus and all fees', () => {
  const r = H.casino(heists.casino, { targetId: 'diamonds', firstWeekly: true, buyer: 'low', crewPct: { gunman: 5, driver: 5, hacker: 10 }, cuts: [85, 15] });
  close(r.gross, 2303000 * 1.86);
  close(r.net, 2303000 * 1.86 * (1 - 0.35));
  close(r.players[1].value, r.net * 0.15);
});

test('Acid Lab boost: next 80 units at 2x, same supply per unit', () => {
  const acid = def('acid');
  const eq = { equipment: true };
  // Calibrated to never run out of supply: a full lab (160) goes 4 h -> 3 h with the boost.
  const lots = { barMinutes: 100000 };
  const full = b => P.project(acid, biz({ upgrades: eq, calibration: lots, boost: b }), 0).minutesToStop;
  close(full(null), 240);
  close(full({ units: 80 }), 180);
  close(P.project(acid, biz({ calibration: { barMinutes: 100000 }, boost: { units: 80 } }), 0).minutesToStop, 270); // 6 h -> 4h30 sem upgrade
  // 30 min boosted = 40 units, 40 boosted units left.
  const p = P.project(acid, biz({ upgrades: eq, calibration: lots, boost: { units: 80 } }), 30);
  close(p.stock, 40);
  close(p.boostLeft, 40);
  // A full supply bar (50 units) lasts half as long while boosted.
  close(P.project(acid, biz({ upgrades: eq, boost: { units: 80 } }), 0).minutesToSupplyEmpty, 37.5);
  close(P.project(acid, biz({ upgrades: eq }), 0).minutesToSupplyEmpty, 75);
  // Past the boosted units the normal pace resumes: 80 boosted (60 min) + 20 normal (30 min).
  close(P.project(acid, biz({ upgrades: eq, calibration: lots, boost: { units: 80 } }), 90).stock, 100);
});

test('store rebase keeps the boost units that were not used yet', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gta-boost-')), 'data.json');
  const store = createStore(file, catalog);
  const b = store.get().businesses.acid;
  Object.assign(b, { owned: true, upgrades: { equipment: true }, supplyPct: 100, stock: 0, activeMinutes: 15, boost: { units: 80, startedAt: 0, endsAt: Infinity } });
  store.rebase('acid');
  close(b.stock, 20);
  close(b.boost.units, 60);
});
