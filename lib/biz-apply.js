// Applies what the screen reader saw (lib/biz-read.js) to the player's businesses, like "Informar
// níveis" would, and says what changed. The businesses it touches must be rebased to now first.
// UMD: used by the main process and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./nightclub.js'));
  else root.GtaBizApply = factory(root.GtaNightclub);
})(typeof self !== 'undefined' ? self : this, function (NC) {
  'use strict';

  const STOCK_TOL = 0.02; // fraction of the capacity: smaller differences are the model's rounding
  const SUPPLY_TOL = 3; // percentage points
  const pct = v => `${Math.round(v)}%`;

  // reading: { screen: 'mct', cards: [{ id, stock, supplies }] } | { screen: 'nightclub', goods: [{ id, units, max }] }
  // Returns { changes: [{ id, name, text }], businesses: [ids touched] }.
  function apply(catalog, state, reading) {
    const changes = [];
    const touched = [];
    if (!reading) return { changes, businesses: touched };
    if (reading.screen === 'mct') {
      for (const card of reading.cards) {
        if (card.id === 'nightclub') { mctNightclub(catalog, state, card, changes); continue; }
        const def = catalog.businesses.find(b => b.id === card.id);
        if (!def) continue; // hangar (Air-Freight) is not tracked
        const biz = state.businesses[def.id];
        const parts = [];
        if (!biz.owned) { biz.owned = true; parts.push('marcado como seu'); }
        const units = card.stock * def.capacity;
        if (Math.abs(units - biz.stock) > def.capacity * STOCK_TOL) {
          biz.stock = units;
          parts.push(`estoque ${pct(card.stock * 100)}`);
        }
        if (card.supplies != null) {
          const sup = card.supplies * 100;
          if (Math.abs(sup - biz.supplyPct) > SUPPLY_TOL) {
            // Supplies well above what the app had: the ones on the way already arrived.
            if (biz.delivery && sup >= biz.supplyPct + 20) biz.delivery = null;
            biz.supplyPct = sup;
            parts.push(`suprimentos ${pct(sup)}`);
          }
        }
        touched.push(def.id);
        if (parts.length) changes.push({ id: def.id, name: def.name, text: parts.join(', ') });
      }
    } else if (reading.screen === 'nightclub') nightclubGoods(catalog, state, reading.goods, changes);
    return { changes, businesses: touched };
  }

  // The MCT shows only the Nightclub's total stock: spread the difference over the goods in proportion.
  function mctNightclub(catalog, state, card, changes) {
    const cfg = catalog.nightclub, nc = state.nightclub;
    const parts = [];
    if (!nc.owned) { nc.owned = true; parts.push('marcado como seu'); }
    const p = NC.project(cfg, state, 0);
    const target = card.stock * p.capacity;
    if (Math.abs(target - p.units) > p.capacity * STOCK_TOL) {
      if (p.units > 0) {
        const k = target / p.units;
        for (const g of p.goods) nc.stock[g.id] = Math.min(g.cap, g.stock * k);
      } else {
        // Nothing known per good: fill the linked goods (or all) evenly up to the total.
        const pool = p.goods.filter(g => g.active).length ? p.goods.filter(g => g.active) : p.goods;
        const cap = pool.reduce((s, g) => s + g.cap, 0);
        for (const g of pool) nc.stock[g.id] = Math.min(g.cap, (g.cap / cap) * target);
      }
      parts.push(`depósito ${pct(card.stock * 100)}`);
    }
    if (parts.length) changes.push({ id: 'nightclub', name: 'Nightclub', text: parts.join(', ') });
  }

  // "Sell Goods": exact units of each good; the capacities also tell the warehouse floors.
  function nightclubGoods(catalog, state, goods, changes) {
    const cfg = catalog.nightclub, nc = state.nightclub;
    const valid = goods.filter(r => {
      const g = cfg.goods.find(x => x.id === r.id);
      return g && r.max % g.perFloor === 0 && r.max / g.perFloor >= 1 && r.max / g.perFloor <= cfg.floorsMax && r.units <= r.max;
    });
    if (!valid.length) return;
    const parts = [];
    if (!nc.owned) { nc.owned = true; parts.push('marcado como seu'); }
    // Floors: what most goods agree on.
    const votes = {};
    for (const r of valid) { const f = r.max / cfg.goods.find(x => x.id === r.id).perFloor; votes[f] = (votes[f] || 0) + 1; }
    const floors = Number(Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0]);
    if (floors !== nc.floors) { nc.floors = floors; parts.push(`${floors} ${floors === 1 ? 'andar' : 'andares'} de depósito`); }
    const changed = [];
    for (const r of valid) {
      const g = cfg.goods.find(x => x.id === r.id);
      if (r.max !== g.perFloor * floors) continue; // disagrees with the others: misread
      if (Math.abs((Number(nc.stock[g.id]) || 0) - r.units) >= 1) changed.push(`${g.name} ${r.units}/${r.max}`);
      nc.stock[g.id] = r.units;
    }
    if (changed.length) parts.push(changed.join(', '));
    if (parts.length) changes.push({ id: 'nightclub', name: 'Nightclub', text: parts.join(', ') });
  }

  return { apply };
});
