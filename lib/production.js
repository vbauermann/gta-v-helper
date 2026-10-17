// Production model shared by the main process (timers, notifications) and the renderer (countdowns).
// Time here is "active minutes": minutes the player spent in an online session, since businesses
// only produce while you are in GTA Online.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaProduction = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function tier(def, upgrades) {
    const eq = !!(upgrades && upgrades.equipment);
    const st = !!(upgrades && upgrades.staff) && def.upgrades.includes('staff');
    if (eq && st) return 'both';
    if (eq) return 'equipment';
    if (st) return 'staff';
    return 'none';
  }

  // Calibration lets the player override the estimates with what they measured in game.
  function rates(def, upgrades, calibration) {
    const cal = calibration || {};
    const t = tier(def, upgrades);
    const minutesPerUnit = positive(cal.minutesPerUnit) || def.minutesPerUnit[t];
    const unitsPerBar = positive(cal.barMinutes)
      ? cal.barMinutes / minutesPerUnit
      : def.unitsPerBar[upgrades && upgrades.equipment ? 'equipment' : 'noEquipment'];
    return {
      tier: t,
      minutesPerUnit,
      unitsPerBar,
      barMinutes: unitsPerBar * minutesPerUnit,
      fullStockMinutes: def.capacity * minutesPerUnit,
      unitValue: def.unitValue[t]
    };
  }

  // Projects a snapshot (supply %, stock units) forward by `activeMinutes` of online play.
  // Bought supplies (`biz.delivery.at`, in active minutes from the snapshot) arrive later and
  // refill the bar to 100%; until then production runs on what is left.
  function project(def, biz, activeMinutes) {
    const at = biz.delivery ? positive(biz.delivery.at) : null;
    const t = Math.max(0, activeMinutes);
    if (!at) return { ...run(def, biz, t), deliveryIn: null };
    const arrived = s => ({ ...biz, supplyPct: 100, stock: s.stock, delivery: null, boost: biz.boost ? { ...biz.boost, units: s.boostLeft } : biz.boost });
    if (t >= at) return { ...run(def, arrived(run(def, biz, at)), t - at), deliveryIn: null };
    const now = run(def, biz, t);
    const atDelivery = run(def, biz, at);
    const out = { ...now, deliveryIn: at - t };
    if (atDelivery.stopsOn === 'capacity' && !atDelivery.producing) return out; // stock fills before the supplies arrive
    const after = run(def, arrived(atDelivery), 0);
    const minutesToStop = at - t + after.minutesToStop;
    return {
      ...out,
      stopsOn: after.stopsOn,
      minutesToStop,
      minutesToSupplyEmpty: after.stopsOn === 'supply' ? minutesToStop : null,
      minutesToFull: after.stopsOn === 'capacity' ? minutesToStop : null
    };
  }

  // A daily boost (Acid Lab) makes the next `biz.boost.units` units `def.boost.speed` times faster;
  // each unit still uses the same supply, so supplies drain faster while it lasts.
  function run(def, biz, activeMinutes) {
    const r = rates(def, biz.upgrades, biz.calibration);
    const supplyPerUnit = 100 / r.unitsPerBar;
    const supply0 = clamp(biz.supplyPct, 0, 100);
    const stock0 = clamp(biz.stock, 0, def.capacity);
    const bySupply = supply0 / supplyPerUnit;
    const byCapacity = def.capacity - stock0;
    const maxUnits = Math.max(0, Math.min(bySupply, byCapacity));
    const boostUnits = def.boost && biz.boost ? positive(biz.boost.units) || 0 : 0;
    const fast = boostUnits ? r.minutesPerUnit / def.boost.speed : r.minutesPerUnit;
    const boosted = Math.min(boostUnits, maxUnits);
    const t = Math.max(0, activeMinutes);
    const raw = t <= boosted * fast ? t / fast : boosted + (t - boosted * fast) / r.minutesPerUnit;
    const produced = Math.min(raw, maxUnits);
    const boostLeft = Math.max(0, boostUnits - produced);
    const boostedLeft = Math.max(0, boosted - produced);
    const remainingMinutes = boostedLeft * fast + (maxUnits - produced - boostedLeft) * r.minutesPerUnit;
    const stopsOn = bySupply <= byCapacity ? 'supply' : 'capacity';
    const supplyPct = Math.max(0, supply0 - produced * supplyPerUnit);
    const stock = Math.min(def.capacity, stock0 + produced);
    return {
      rates: r,
      supplyPct,
      stock,
      producing: remainingMinutes > 1e-9,
      stopsOn,
      minutesToStop: remainingMinutes,
      minutesToSupplyEmpty: stopsOn === 'supply' ? remainingMinutes : null,
      minutesToFull: stopsOn === 'capacity' ? remainingMinutes : null,
      stockValue: Math.floor(stock) * r.unitValue,
      boostLeft
    };
  }

  function positive(v) {
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
  }

  function clamp(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }

  function formatMinutes(min) {
    if (min == null) return '—';
    const total = Math.max(0, Math.round(min * 60));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
    if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  return { tier, rates, project, formatMinutes };
});
