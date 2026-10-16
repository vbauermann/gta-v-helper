// User data (businesses, timers, settings) persisted as JSON in Electron's userData folder.
const fs = require('node:fs');
const path = require('node:path');
const { project } = require('./lib/production.js');

const DEFAULT_SETTINGS = Object.freeze({
  detection: 'auto', // 'auto': counts only while GTA is open; 'always': counts whenever the app is open
  paused: false,
  warnMinutes: 10,
  notify: true,
  closeToTray: true,
  theme: 'dark',
  overlay: Object.freeze({ print: 'all', size: 'md', opacity: 0.92, hotkeys: true, pos: null })
});

function emptyBusiness() {
  return {
    owned: false,
    upgrades: { equipment: false, staff: false, security: false },
    supplyPct: 0,
    stock: 0,
    activeMinutes: 0,
    calibration: {},
    alerts: { warned: false, empty: false, full: false }
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
        overlay: { ...DEFAULT_SETTINGS.overlay, ...(raw.settings && raw.settings.overlay) }
      },
      businesses,
      cayoCooldownEndsAt: typeof raw.cayoCooldownEndsAt === 'number' ? raw.cayoCooldownEndsAt : null
    };
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
    biz.activeMinutes = 0;
    biz.alerts = { warned: false, empty: false, full: false };
    return { def, biz };
  }

  return { get: () => state, save, rebase };
}

module.exports = { createStore, DEFAULT_SETTINGS };
