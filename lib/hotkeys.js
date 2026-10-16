// Fingerprint overlay shortcuts: defaults, validation and key-capture. Shared by the main
// process (registration), the app (recording a new combo) and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaHotkeys = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ACTIONS = [
    { id: 'toggle', label: 'Mostra ou esconde o overlay' },
    { id: 'all', label: 'Mostra as 4 digitais pra comparar' },
    { id: 'S', label: 'Mostra só a digital S' },
    { id: 'O', label: 'Mostra só a digital O' },
    { id: 'J', label: 'Mostra só a digital J' },
    { id: 'L', label: 'Mostra só a digital L' },
    { id: 'move', label: 'Liga ou desliga o modo mover' },
    { id: 'auto', label: 'Liga ou desliga a marcação automática das peças' }
  ];

  const DEFAULT_KEYS = Object.freeze({
    toggle: 'Ctrl+Shift+F', all: 'Ctrl+Shift+0', S: 'Ctrl+Shift+1', O: 'Ctrl+Shift+2',
    J: 'Ctrl+Shift+3', L: 'Ctrl+Shift+4', move: 'Ctrl+Shift+M', auto: 'Ctrl+Shift+D'
  });

  const MODS = ['Ctrl', 'Alt', 'Shift', 'Super'];
  const KEY = /^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|num[0-9]|Insert|Delete|Home|End|PageUp|PageDown)$/;

  // Electron accelerator in a fixed modifier order, e.g. "Ctrl+Shift+F". A plain letter or digit
  // needs a modifier, otherwise it would fire while typing in the game chat.
  function isValid(accel) {
    if (typeof accel !== 'string') return false;
    const parts = accel.split('+');
    const key = parts.pop();
    if (!KEY.test(key)) return false;
    const seen = new Set();
    let last = -1;
    for (const m of parts) {
      const i = MODS.indexOf(m);
      if (i <= last || seen.has(m)) return false;
      seen.add(m);
      last = i;
    }
    return parts.length > 0 || /^F\d/.test(key);
  }

  // Builds an accelerator from a keydown event; null while only modifiers are held or the key
  // isn't supported.
  function fromEvent(e) {
    let key = null;
    const code = e.code || '';
    if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
    else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
    else if (/^Numpad[0-9]$/.test(code)) key = `num${code.slice(6)}`;
    else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) key = code;
    else if (['Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'].includes(code)) key = code;
    if (!key) return null;
    const mods = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push('Super');
    const accel = [...mods, key].join('+');
    return isValid(accel) ? accel : null;
  }

  // Merges saved keys over the defaults, dropping invalid ones.
  function normalize(keys) {
    const out = { ...DEFAULT_KEYS };
    for (const a of ACTIONS) if (keys && isValid(keys[a.id])) out[a.id] = keys[a.id];
    return out;
  }

  // Ids that share a combo with another action.
  function duplicates(keys) {
    const seen = new Map();
    const dup = new Set();
    for (const a of ACTIONS) {
      const k = keys[a.id];
      if (seen.has(k)) { dup.add(a.id); dup.add(seen.get(k)); } else seen.set(k, a.id);
    }
    return [...dup];
  }

  return { ACTIONS, DEFAULT_KEYS, isValid, fromEvent, normalize, duplicates };
});
