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

  return { planBags, cayo, casino, cutsTotal };
});
