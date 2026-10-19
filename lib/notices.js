// Notices ("Avisos"): everything the app warned about (businesses, Cayo cooldown, new week, update)
// plus the player's periodic reminders ("Conferir o Terrorbyte a cada 2h"). The main process keeps
// the list in the state and shows the Windows notification; the renderer shows the bell and the page.
// UMD: used by the main process, the renderer and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaNotices = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_ITEMS = 100;
  const MAX_REMINDERS = 20;
  const INTERVALS = [15, 30, 45, 60, 90, 120, 180, 240];
  const KINDS = ['warn', 'empty', 'full', 'heist', 'reminder', 'week', 'update', 'test'];
  const PAGES = ['businesses', 'cayo', 'weekly', 'settings', 'todos'];

  // One-click reminders on the settings page.
  const SUGGESTIONS = [
    { title: 'Conferir o Terrorbyte', every: 120 },
    { title: 'Conferir o Nightclub', every: 120 },
    { title: 'Coletar os cofres das propriedades', every: 180 },
    { title: 'Beber água e esticar as pernas', every: 60 }
  ];

  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const newId = (prefix, now) => `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function clampEvery(v) {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(24 * 60, Math.max(5, n)) : 120;
  }

  // Validates a reminder coming from the renderer or the saved file. Throws when the title is empty.
  function sanitizeReminder(r, now) {
    const title = str(r && r.title, 80);
    if (!title) throw new TypeError('dê um nome ao lembrete');
    const every = clampEvery(r.every);
    return {
      id: typeof r.id === 'string' && r.id ? r.id.slice(0, 40) : newId('r', now),
      title,
      every,
      enabled: r.enabled !== false,
      inGame: r.inGame !== false, // counts only while the timers count (GTA open, not paused)
      elapsed: Math.min(every, Math.max(0, Number(r.elapsed) || 0))
    };
  }

  function sanitizeItem(n) {
    if (!n || typeof n.title !== 'string' || typeof n.at !== 'number') return null;
    return {
      id: str(n.id, 40) || `n-${n.at}`,
      kind: KINDS.includes(n.kind) ? n.kind : 'reminder',
      title: str(n.title, 120),
      body: str(n.body, 240),
      page: PAGES.includes(n.page) ? n.page : null,
      at: n.at,
      read: !!n.read
    };
  }

  // Saved notices, or the first-run set (Terrorbyte every 2 h of play).
  function load(saved, now) {
    if (!saved || typeof saved !== 'object') {
      return { items: [], reminders: [sanitizeReminder({ title: 'Conferir o Terrorbyte', every: 120 }, now)], weekSeen: null, updateSeen: null };
    }
    const items = (Array.isArray(saved.items) ? saved.items : []).map(sanitizeItem).filter(Boolean).slice(0, MAX_ITEMS);
    const reminders = [];
    for (const r of Array.isArray(saved.reminders) ? saved.reminders : []) {
      try { reminders.push(sanitizeReminder(r, now)); } catch { /* drop invalid */ }
    }
    return {
      items,
      reminders: reminders.slice(0, MAX_REMINDERS),
      weekSeen: typeof saved.weekSeen === 'string' ? saved.weekSeen : null,
      updateSeen: typeof saved.updateSeen === 'string' ? saved.updateSeen : null
    };
  }

  // Adds a notice at the top of the list (newest first) and returns it.
  function push(list, notice, now) {
    const item = sanitizeItem({ ...notice, id: newId('n', now), at: now, read: false });
    list.unshift(item);
    if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;
    return item;
  }

  const unread = list => list.filter(n => !n.read).length;

  // Moves the reminders forward and returns the ones that are due. deltaMinutes is real time;
  // in-game reminders only advance while counting.
  function advance(reminders, deltaMinutes, counting) {
    const due = [];
    if (!(deltaMinutes > 0)) return due;
    for (const r of reminders) {
      if (!r.enabled || (r.inGame && !counting)) continue;
      r.elapsed += deltaMinutes;
      if (r.elapsed >= r.every) {
        r.elapsed = 0;
        due.push(r);
      }
    }
    return due;
  }

  const minutesLeft = r => Math.max(0, r.every - r.elapsed);

  function formatEvery(min) {
    const hh = Math.floor(min / 60), mm = min % 60;
    if (!hh) return `${mm} min`;
    return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
  }

  return { INTERVALS, KINDS, SUGGESTIONS, MAX_REMINDERS, sanitizeReminder, load, push, unread, advance, minutesLeft, formatEvery };
});
