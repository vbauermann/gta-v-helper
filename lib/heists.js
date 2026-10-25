// Heist payout math for Cayo Perico and the Diamond Casino. Pure functions, shared with tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaHeists = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Fills the crew's bags with the most valuable loot first. Divisible loot (gold, cocaine, weed,
  // cash) can be grabbed partially; a painting is all or nothing.
  function planBags(secondaries, found, crewSize) {
    const capacity = Math.max(0, crewSize) * 100;
    let free = capacity;
    const ordered = secondaries
      .filter(s => (found[s.id] || 0) > 0 && !(s.needsTwo && crewSize < 2))
      .slice()
      .sort((a, b) => b.stackValue / b.bagPct - a.stackValue / a.bagPct);
    const picks = [];
    for (const s of ordered) {
      let stacks = 0;
      const available = found[s.id];
      if (s.divisible) {
        stacks = Math.min(available, free / s.bagPct);
      } else {
        stacks = Math.min(available, Math.floor(free / s.bagPct + 1e-9));
      }
      if (stacks <= 1e-9) continue;
      free -= stacks * s.bagPct;
      picks.push({ id: s.id, name: s.name, stacks, bagPct: stacks * s.bagPct, value: stacks * s.stackValue });
    }
    const skipped = secondaries
      .filter(s => (found[s.id] || 0) > 0 && s.needsTwo && crewSize < 2)
      .map(s => s.id);
    return {
      picks,
      value: picks.reduce((sum, p) => sum + p.value, 0),
      usedPct: capacity - free,
      capacityPct: capacity,
      skipped
    };
  }

  // Kortz Center: each item goes whole into one bag (100% each), so the best plan is a packing
  // problem, not a ratio. Bag space comes in steps of 10%, which keeps an exact search small:
  // fill one bag at a time with every "full" combination and remember the best for what is left.
  function kortz(data, input) {
    const crew = Math.max(1, Math.min(4, Number(input.crewSize) || 1));
    const k = input.hard ? 1 + data.hardBonusPct / 100 : 1;
    const found = input.found || {};
    const types = data.loot
      .filter(l => (found[l.id] || 0) > 0 && !(l.needsTwo && crew < 2))
      .map(l => ({ ...l, units: Math.round(l.bagPct / 10), value: (l.avg || (l.min + l.max) / 2) * k, count: found[l.id] }));
    const memo = new Map();
    function fills(counts) {
      const out = [];
      const pick = new Array(types.length).fill(0);
      (function walk(i, room, value) {
        if (i === types.length) {
          // Only full bags: nothing left that still fits.
          if (types.every((t, j) => counts[j] - pick[j] <= 0 || t.units > room)) out.push({ pick: pick.slice(), value });
          return;
        }
        const max = Math.min(counts[i], Math.floor(room / types[i].units));
        for (let n = max; n >= 0; n--) { pick[i] = n; walk(i + 1, room - n * types[i].units, value + n * types[i].value); }
        pick[i] = 0;
      })(0, 10, 0);
      return out;
    }
    function best(bags, counts) {
      if (!bags) return { value: 0, plan: [] };
      const key = `${bags}|${counts.join(',')}`;
      if (memo.has(key)) return memo.get(key);
      let top = { value: 0, plan: [] };
      // Richest fills first: once a fill times the bags left can't beat the best, no plan whose
      // richest bag is this one (or poorer) can either.
      for (const f of fills(counts).sort((a, b) => b.value - a.value)) {
        if (!f.value || f.value * bags <= top.value + 1e-6) break;
        const rest = best(bags - 1, counts.map((c, j) => c - f.pick[j]));
        if (f.value + rest.value > top.value + 1e-6) top = { value: f.value + rest.value, plan: [f.pick, ...rest.plan] };
      }
      memo.set(key, top);
      return top;
    }
    const r = best(crew, types.map(t => t.count));
    const bags = Array.from({ length: crew }, (_, b) => {
      const pick = r.plan[b] || types.map(() => 0);
      const items = types.map((t, j) => ({ id: t.id, name: t.name, count: pick[j], bagPct: pick[j] * t.bagPct, value: pick[j] * t.value }))
        .filter(x => x.count > 0)
        .sort((a, b2) => b2.value - a.value);
      return { items, usedPct: items.reduce((s, x) => s + x.bagPct, 0), value: items.reduce((s, x) => s + x.value, 0) };
    });
    const left = types.map((t, j) => ({ id: t.id, name: t.name, count: t.count - bags.reduce((s, b) => s + ((b.items.find(x => x.id === t.id) || {}).count || 0), 0) }))
      .filter(x => x.count > 0);
    return {
      bags,
      value: r.value,
      left,
      skipped: data.loot.filter(l => (found[l.id] || 0) > 0 && l.needsTwo && crew < 2).map(l => l.id)
    };
  }

  function cayo(data, input) {
    const primary = data.primaries.find(p => p.id === input.primaryId) || data.primaries[0];
    const primaryValue = primary.value * (input.hard ? 1 + data.hardBonusPct / 100 : 1);
    const bags = planBags(data.secondaries, input.found || {}, input.crewSize);
    const safe = Math.max(0, Number(input.safe) || 0);
    const gross = primaryValue + bags.value + safe;
    const feePct = data.feesPct.pavel + data.feesPct.fencing;
    const fees = gross * feePct / 100;
    const net = gross - fees;
    const elite = input.elite ? data.eliteChallenge[input.hard ? 'hard' : 'normal'] : 0;
    return {
      primary: primary.name,
      primaryValue,
      bags,
      safe,
      gross,
      feePct,
      fees,
      net,
      players: split(net, input.cuts, elite),
      cooldownMinutes: data.cooldownMinutes[input.crewSize > 1 ? 'crew' : 'solo']
    };
  }

  function casino(data, input) {
    const target = data.targets.find(t => t.id === input.targetId) || data.targets[0];
    const potential = target.value * (input.hard ? 1 + data.hardBonusPct / 100 : 1);
    const take = input.take > 0 ? Number(input.take) : potential;
    const weekly = input.firstWeekly ? data.weeklyMultiplier : 1;
    const gross = take * weekly;
    const crewPct = ['gunman', 'driver', 'hacker'].reduce((sum, k) => sum + (Number(input.crewPct && input.crewPct[k]) || 0), 0);
    const buyerPct = data.buyerFeePct[input.buyer] || 0;
    const fees = [
      { name: 'Lester', pct: data.lesterPct },
      { name: 'Comprador', pct: buyerPct },
      { name: 'Equipe (atirador, motorista, hacker)', pct: crewPct }
    ].map(f => ({ ...f, value: gross * f.pct / 100 }));
    const net = gross - fees.reduce((sum, f) => sum + f.value, 0);
    return { target: target.name, potential, take, weekly, gross, fees, net, players: split(net, input.cuts, 0) };
  }

  function split(net, cuts, bonus) {
    const list = Array.isArray(cuts) && cuts.length ? cuts : [100];
    return list.map((pct, i) => ({ player: i + 1, pct, value: net * (Number(pct) || 0) / 100 + bonus }));
  }

  function cutsTotal(cuts) {
    return (cuts || []).reduce((sum, c) => sum + (Number(c) || 0), 0);
  }

  return { planBags, kortz, cayo, casino, cutsTotal };
});
