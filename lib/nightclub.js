// Nightclub warehouse: each technician assigned to a linked business makes that business's goods
// (no supplies needed) while the player is online. Stock is a snapshot plus the active minutes since
// it, like the other businesses (lib/production.js). Also the Special Cargo crate sale table.
// UMD: used by the main process, the renderer and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaNightclub = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Cargo and Shipments needs a CEO special cargo warehouse or a Smuggler's hangar (marked on the map).
  const cargoSource = state => state.warehouses.cargo.length > 0
    || !!(state.map && state.map.owned.some(id => typeof id === 'string' && id.startsWith('hangar-')));

  // Goods whose technician is assigned. state: the whole user state; cfg: catalog.nightclub.
  function linked(cfg, state) {
    const out = new Set();
    for (const g of cfg.goods) {
      if (g.source === 'cargo') {
        if (state.nightclub.cargo && cargoSource(state)) out.add(g.id);
      } else {
        const biz = state.businesses[g.source];
        if (biz && biz.owned && biz.nightclub) out.add(g.id);
      }
    }
    return out;
  }

  const capacity = (cfg, nc, g) => g.perFloor * Math.min(cfg.floorsMax, Math.max(1, nc.floors || 1));
  const minutesPerUnit = (cfg, nc, g) => g.minutes * (nc.equipment ? 1 : cfg.noEquipmentFactor);

  // Stock of every good after `minutes` of online time since the snapshot.
  function project(cfg, state, minutes) {
    const nc = state.nightclub;
    const on = linked(cfg, state);
    const goods = cfg.goods.map(g => {
      const cap = capacity(cfg, nc, g);
      const mpu = minutesPerUnit(cfg, nc, g);
      const start = Math.min(cap, Math.max(0, Number(nc.stock[g.id]) || 0));
      const active = on.has(g.id);
      const stock = active ? Math.min(cap, start + Math.max(0, minutes) / mpu) : start;
      const minutesToFull = active && stock < cap ? (cap - stock) * mpu : 0;
      return { id: g.id, name: g.name, source: g.source, active, cap, stock, mpu, minutesToFull, value: Math.floor(stock + 1e-9) * g.unitValue, maxValue: cap * g.unitValue };
    });
    const active = goods.filter(g => g.active);
    const producing = active.some(g => g.stock < g.cap - 1e-9);
    return {
      goods,
      technicians: on.size,
      producing,
      full: active.length > 0 && !producing,
      value: goods.reduce((s, g) => s + g.value, 0),
      maxValue: goods.reduce((s, g) => s + g.maxValue, 0),
      units: goods.reduce((s, g) => s + g.stock, 0),
      capacity: goods.reduce((s, g) => s + g.cap, 0),
      // When the last linked good fills up (production stops).
      minutesToFull: active.reduce((m, g) => Math.max(m, g.minutesToFull), 0),
      minutesToFirstFull: active.filter(g => g.minutesToFull > 0).reduce((m, g) => Math.min(m, g.minutesToFull), Infinity)
    };
  }

  // Folds the active minutes into the snapshot (before changing links, floors or upgrades).
  function rebase(cfg, state) {
    const p = project(cfg, state, state.nightclub.activeMinutes);
    const stock = {};
    for (const g of p.goods) stock[g.id] = g.stock;
    state.nightclub.stock = stock;
    state.nightclub.activeMinutes = 0;
  }

  // Special Cargo: sale value of `crates` crates sold together (price per crate rises with the amount).
  function cargoValue(table, crates) {
    const n = Math.max(0, Math.floor(crates));
    if (!n) return 0;
    let per = table[0][1];
    for (const [min, price] of table) if (n >= min) per = price;
    return n * per;
  }

  return { linked, cargoSource, capacity, minutesPerUnit, project, rebase, cargoValue };
});
