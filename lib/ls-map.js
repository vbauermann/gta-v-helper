// Los Santos map ownership rules, shared by the main process (validation) and the tests.
// A category's `owns` is how many of its places a player can have (0 = no limit); marking one more
// replaces the oldest. Categories with `business` mirror the Negócios page's "Tenho este".
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaLsMap = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function categories(map) {
    return new Map(map.groups.flatMap(g => g.categories.map(c => [c.id, c])));
  }

  // Returns { owned, business } where business is null or { id, owned } to apply to the business.
  function setOwned(map, owned, pointId, on) {
    const point = map.points.find(p => p.id === pointId);
    if (!point) throw new TypeError('local desconhecido');
    const cat = categories(map).get(point.category);
    if (!cat || cat.owns === undefined || cat.id.startsWith('animal-') || cat.id === 'tourist-board') throw new TypeError('local não pode ser marcado');
    const valid = new Set(map.points.map(p => p.id));
    let next = (Array.isArray(owned) ? owned : []).filter(id => typeof id === 'string' && valid.has(id) && id !== pointId);
    if (on) {
      const same = next.filter(id => map.points.find(p => p.id === id).category === cat.id);
      if (cat.owns > 0 && same.length >= cat.owns) {
        const drop = new Set(same.slice(0, same.length - cat.owns + 1));
        next = next.filter(id => !drop.has(id));
      }
      next.push(pointId);
    }
    return { owned: next, business: cat.business ? { id: cat.business, owned: !!on } : null };
  }

  // Drops the places of a business the player no longer has (unmarked on the Negócios page).
  function forgetBusiness(map, owned, businessId) {
    const cats = categories(map);
    return (owned || []).filter(id => {
      const p = map.points.find(q => q.id === id);
      return p && cats.get(p.category).business !== businessId;
    });
  }

  return { setOwned, forgetBusiness };
});
