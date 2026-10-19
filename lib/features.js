// Optional features: what collaborators add ships switched off. Each one gets a switch in
// Ajustes > Recursos extras and only shows up or runs once the player turns it on (ADR 0018).
// UMD: used by the main process (defaults, validation), the renderer and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaFeatures = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // { id, title, description }. Ids are saved in the player's settings, so keep them stable.
  const FEATURES = [];

  // Saved switches over "all off", keeping only features that still exist.
  function normalize(saved, list = FEATURES) {
    const out = {};
    for (const f of list) out[f.id] = !!(saved && saved[f.id] === true);
    return out;
  }

  // Patch from the renderer ({ id: boolean }). Throws on anything else.
  function sanitizePatch(patch, list = FEATURES) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('recursos inválidos');
    const out = {};
    for (const [id, on] of Object.entries(patch)) {
      if (!list.some(f => f.id === id)) throw new TypeError('recurso desconhecido');
      if (typeof on !== 'boolean') throw new TypeError('valor inválido');
      out[id] = on;
    }
    return out;
  }

  const isOn = (settings, id) => !!(settings && settings.features && settings.features[id] === true);

  return { FEATURES, normalize, sanitizePatch, isOn };
});
