// User data (businesses, timers, settings) persisted as JSON in Electron's userData folder.
const fs = require('node:fs');
const path = require('node:path');
const { project } = require('./lib/production.js');
const todos = require('./lib/todos.js');
const notices = require('./lib/notices.js');
const features = require('./lib/features.js');

const DEFAULT_SETTINGS = Object.freeze({
  detection: 'auto', // 'auto': counts only while GTA is open; 'always': counts whenever the app is open
  paused: false,
  warnMinutes: 10,
  notify: true,
  closeToTray: true,
  screenRead: true, // read the Terrorbyte / Nightclub screens (biz-scanner.cjs)
  theme: 'dark',
  overlay: Object.freeze({ print: 'all', size: 'md', opacity: 0.92, hotkeys: true, auto: true, pos: null, keys: null }),
  features: Object.freeze({}) // optional features the player turned on (lib/features.js), all off by default
});

function emptyBusiness() {
  return {
    owned: false,
    upgrades: { equipment: false, staff: false, security: false },
    supplyPct: 0,
    stock: 0,
    activeMinutes: 0,
    calibration: {},
    alerts: { warned: false, empty: false, full: false },
    boost: null, // Acid Lab daily boost: { units left, startedAt, endsAt }
    delivery: null, // bought supplies on the way: { at: active minutes from the snapshot, orderedAt }
    nightclub: false // a Nightclub technician is assigned to this business's goods
  };
}

function createStore(file, catalog) {
  let state = load();

  function load() {
    let raw = {};
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // First run or unreadable file: start clean (a corrupt file is kept as .bak by save()).
      if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    }
    const businesses = {};
    for (const def of catalog.businesses) {
      const saved = raw.businesses && raw.businesses[def.id];
      businesses[def.id] = { ...emptyBusiness(), ...saved };
      businesses[def.id].upgrades = { ...emptyBusiness().upgrades, ...(saved && saved.upgrades) };
      businesses[def.id].alerts = { ...emptyBusiness().alerts, ...(saved && saved.alerts) };
    }
    return {
      version: 1,
      settings: {
        ...DEFAULT_SETTINGS,
        ...raw.settings,
        overlay: { ...DEFAULT_SETTINGS.overlay, ...(raw.settings && raw.settings.overlay) },
        features: features.normalize(raw.settings && raw.settings.features)
      },
      businesses,
      cayoCooldownEndsAt: typeof raw.cayoCooldownEndsAt === 'number' ? raw.cayoCooldownEndsAt : null,
      // Los Santos map: ids of the places the player marked as theirs (data/ls-map.json).
      // Heist wiki: setup ids done per heist ({ casino: ['scope', ...] }).
      heistProgress: loadProgress(raw.heistProgress),
      map: { owned: Array.isArray(raw.map && raw.map.owned) ? raw.map.owned.filter(id => typeof id === 'string') : [] },
      todos: loadTodos(raw.todos),
      // Nightclub warehouse (technicians make goods) and the CEO / Import-Export warehouses.
      nightclub: loadNightclub(raw.nightclub, raw.map),
      warehouses: loadWarehouses(raw.warehouses),
      // Avisos: notice history (newest first) and the player's periodic reminders.
      notices: notices.load(raw.notices, Date.now())
    };
  }

  // Daily/weekly tasks. First run gets the starter list; week-only tasks drop once their week ends.
  function loadTodos(saved) {
    // dailyHour follows the game's reset (local time) until the player picks one (dailyHourSet).
    const auto = { dailyHour: todos.defaultDailyHour(), dailyHourSet: false };
    if (!saved || !Array.isArray(saved.items)) return { ...auto, items: todos.firstRun() };
    const now = Date.now();
    const items = saved.items.filter(i => i && typeof i.id === 'string' && typeof i.title === 'string' && !todos.isExpired(i, now));
    const picked = saved.dailyHourSet === true && Number.isInteger(saved.dailyHour) && saved.dailyHour >= 0 && saved.dailyHour < 24;
    return { ...(picked ? { dailyHour: saved.dailyHour, dailyHourSet: true } : auto), items };
  }

  function loadNightclub(saved, map) {
    const n = saved && typeof saved === 'object' ? saved : {};
    const stock = {};
    for (const g of (catalog.nightclub && catalog.nightclub.goods) || []) stock[g.id] = Math.max(0, Number(n.stock && n.stock[g.id]) || 0);
    // Before v1.12 the Nightclub was only a place on the map: marking it there means owning it.
    const fromMap = !saved && map && Array.isArray(map.owned) && map.owned.some(id => typeof id === 'string' && id.startsWith('nightclub-'));
    return {
      owned: saved ? !!n.owned : !!fromMap,
      floors: Number.isInteger(n.floors) && n.floors >= 1 && n.floors <= 5 ? n.floors : 1,
      equipment: !!n.equipment,
      cargo: !!n.cargo, // technician on Cargo and Shipments (needs a CEO warehouse)
      stock,
      activeMinutes: Math.max(0, Number(n.activeMinutes) || 0),
      alerted: !!n.alerted
    };
  }

  // Warehouses point at Los Santos map places (data/ls-map.json); the map marks are the ownership.
  function loadWarehouses(saved) {
    const w = saved && typeof saved === 'object' ? saved : {};
    const cargo = (Array.isArray(w.cargo) ? w.cargo : [])
      .filter(x => x && typeof x.point === 'string')
      .map(x => ({ point: x.point, crates: Math.max(0, Math.floor(Number(x.crates) || 0)) }));
    const v = w.vehicle && typeof w.vehicle === 'object' ? w.vehicle : {};
    return { cargo, vehicle: { point: typeof v.point === 'string' ? v.point : null, cars: Math.max(0, Math.floor(Number(v.cars) || 0)) } };
  }

  function loadProgress(saved) {
    const out = {};
    if (!saved || typeof saved !== 'object') return out;
    for (const [id, list] of Object.entries(saved)) {
      if (Array.isArray(list)) out[id] = list.filter(x => typeof x === 'string');
    }
    return out;
  }

  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  }

  // Folds elapsed production into the snapshot so later edits start from the real current values.
  function rebase(id) {
    const def = catalog.businesses.find(b => b.id === id);
    const biz = state.businesses[id];
    const p = project(def, biz, biz.activeMinutes);
    biz.supplyPct = p.supplyPct;
    biz.stock = p.stock;
    if (biz.boost) biz.boost.units = p.boostLeft;
    if (biz.delivery) biz.delivery = p.deliveryIn ? { ...biz.delivery, at: p.deliveryIn } : null;
    biz.activeMinutes = 0;
    biz.alerts = { warned: false, empty: false, full: false };
    return { def, biz };
  }

  return { get: () => state, save, rebase };
}

module.exports = { createStore, DEFAULT_SETTINGS };
