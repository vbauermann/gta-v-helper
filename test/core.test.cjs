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
