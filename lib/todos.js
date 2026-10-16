// Daily and weekly to-do list: suggestion catalog and the reset math. A task counts as done while
// its doneAt falls inside the current period. Daily resets at a local hour of the player's choice;
// weekly resets with GTA Online's week (Thursday, at the hour of the weekly update in UTC).
// UMD: used by the main process (validation, first-run seed), the renderer and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaTodos = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HOUR = 3600000, DAY = 24 * HOUR, WEEK = 7 * DAY;
  const WEEKLY_DEFAULT = { day: 4, hour: 10 }; // Thursday 10:00 UTC

  // key: stable id so a suggestion is added once; rotation: label in weekly.rotations shown as its note.
  const SUGGESTIONS = [
    { group: 'Negócios', period: 'daily', key: 'supply-acid', title: 'Abastecer o Acid Lab' },
    { group: 'Negócios', period: 'daily', key: 'supply-cocaine', title: 'Abastecer a Cocaína' },
    { group: 'Negócios', period: 'daily', key: 'supply-meth', title: 'Abastecer a Metanfetamina' },
    { group: 'Negócios', period: 'daily', key: 'supply-cash', title: 'Abastecer o Dinheiro Falso' },
    { group: 'Negócios', period: 'daily', key: 'supply-weed', title: 'Abastecer a Maconha' },
    { group: 'Negócios', period: 'daily', key: 'supply-documents', title: 'Abastecer os Documentos Falsos' },
    { group: 'Negócios', period: 'daily', key: 'supply-bunker', title: 'Abastecer o Bunker' },
    { group: 'Negócios', period: 'daily', key: 'nc-popularity', title: 'Popularidade da boate', note: 'Missão de promoção ou trocar o DJ' },
    { group: 'Negócios', period: 'daily', key: 'cargo', title: 'Comprar carga especial', note: 'Cargo Warehouse' },
    { group: 'Passivos', period: 'daily', key: 'nc-safe', title: 'Coletar o cofre da boate' },
    { group: 'Passivos', period: 'daily', key: 'agency-safe', title: 'Coletar o cofre da Agência' },
    { group: 'Passivos', period: 'daily', key: 'arcade-safe', title: 'Coletar o cofre do Arcade' },
    { group: 'Passivos', period: 'daily', key: 'salvage-safe', title: 'Coletar o cofre do Salvage Yard' },
    { group: 'Coletáveis', period: 'daily', key: 'daily-objectives', title: 'Objetivos diários' },
    { group: 'Coletáveis', period: 'daily', key: 'stash-house', title: 'Stash house' },
    { group: 'Coletáveis', period: 'daily', key: 'gs-cache', title: "G's Cache" },
    { group: 'Golpes', period: 'weekly', key: 'casino', title: 'Golpe do Diamond Casino' },
    { group: 'Golpes', period: 'weekly', key: 'cayo', title: 'Golpe do Cayo Perico' },
    { group: 'Golpes', period: 'weekly', key: 'clucking', title: 'Clucking Bell Farm Raid' },
    { group: 'Golpes', period: 'weekly', key: 'dre', title: 'Dr. Dre', note: "Contrato VIP da Agência (Don't F*** With Dre)" },
    { group: 'Golpes', period: 'weekly', key: 'fib', title: 'FIB Priority File', rotation: 'FIB Priority File' },
    { group: 'Golpes', period: 'weekly', key: 'kortz', title: 'Kortz Center Heist', rotation: 'Kortz Center Heist (alvos)' },
    { group: 'Golpes', period: 'weekly', key: 'salvage', title: 'Roubos do Salvage Yard', rotation: 'Salvage Yard (roubos)' },
    { group: 'Semana', period: 'weekly', key: 'weekly-challenge', title: 'Desafio semanal' }
  ];

  // What Vitor asked for on 2026-10-16; added on the first run only.
  const FIRST_RUN = ['supply-acid', 'supply-cocaine', 'supply-bunker', 'nc-popularity', 'cargo', 'nc-safe', 'casino', 'clucking', 'dre', 'fib'];

  const suggestion = key => SUGGESTIONS.find(s => s.key === key) || null;

  // Weekly anchor (UTC weekday and hour) taken from the bundled week's reset time.
  function weeklyAnchor(resetUtc) {
    const d = new Date(resetUtc);
    return Number.isFinite(d.getTime()) ? { day: d.getUTCDay(), hour: d.getUTCHours() } : WEEKLY_DEFAULT;
  }

  // Start of the period that contains `now` (ms).
  function periodStart(period, now, opts) {
    const o = opts || {};
    if (period === 'daily') {
      const hour = Number.isInteger(o.dailyHour) ? o.dailyHour : 6;
      const d = new Date(now);
      d.setHours(hour, 0, 0, 0);
      if (d.getTime() > now) d.setDate(d.getDate() - 1);
      return d.getTime();
    }
    const a = o.weekly || WEEKLY_DEFAULT;
    const d = new Date(now);
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), a.hour);
    let start = t - ((d.getUTCDay() - a.day + 7) % 7) * DAY;
    if (start > now) start -= WEEK;
    return start;
  }

  // Next reset: the start of the following period (daily handles daylight saving via local dates).
  function nextReset(period, now, opts) {
    if (period === 'weekly') return periodStart('weekly', now, opts) + WEEK;
    const start = new Date(periodStart('daily', now, opts));
    start.setDate(start.getDate() + 1);
    return start.getTime();
  }

  const isDone = (item, now, opts) => typeof item.doneAt === 'number' && item.doneAt >= periodStart(item.period, now, opts);
  const isExpired = (item, now) => typeof item.expiresAt === 'number' && item.expiresAt <= now;

  // Cleans a task coming from the renderer. Throws on anything unexpected.
  function sanitize(input, now) {
    if (!input || typeof input !== 'object') throw new TypeError('tarefa inválida');
    const period = input.period === 'weekly' ? 'weekly' : input.period === 'daily' ? 'daily' : null;
    const title = typeof input.title === 'string' ? input.title.trim().slice(0, 80) : '';
    if (!period || !title) throw new TypeError('tarefa inválida');
    const key = typeof input.key === 'string' && /^[a-z0-9:-]{1,40}$/.test(input.key) ? input.key : null;
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 140) : '';
    const expiresAt = Number.isFinite(input.expiresAt) && input.expiresAt > now ? input.expiresAt : null;
    return { id: key || `c-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, key, title, note, period, doneAt: null, expiresAt };
  }

  function firstRun() {
    return FIRST_RUN.map(key => {
      const s = suggestion(key);
      return { id: key, key, title: s.title, note: '', period: s.period, doneAt: null, expiresAt: null };
    });
  }

  return { SUGGESTIONS, suggestion, weeklyAnchor, periodStart, nextReset, isDone, isExpired, sanitize, firstRun };
});
