// User data (businesses, timers, settings) persisted as JSON in Electron's userData folder.
const fs = require('node:fs');
const path = require('node:path');
const { project } = require('./lib/production.js');
const todos = require('./lib/todos.js');
const features = require('./lib/features.js');

const DEFAULT_SETTINGS = Object.freeze({
  detection: 'auto', // 'auto': counts only while GTA is open; 'always': counts whenever the app is open
  paused: false,
  warnMinutes: 10,
  notify: true,
  closeToTray: true,
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
    delivery: null // bought supplies on the way: { at: active minutes from the snapshot, orderedAt }
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
      map: { owned: Array.isArray(raw.map && raw.map.owned) ? raw.map.owned.filter(id => typeof id === 'string') : [] },
      todos: loadTodos(raw.todos)
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
