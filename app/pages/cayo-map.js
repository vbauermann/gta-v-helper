// "Mapa" tab of the Cayo Perico page: an informative map (no input), with layers that can be
// filtered on the side. Layers and points come from data/heists.json (cayo.map.layers), so
// new categories are data-only changes. Wheel zoom and drag-to-pan like the old scout map.
(function () {
  'use strict';
  const { h, icon } = UI;
  const KEY = 'gta-helper.cayo-map';
  let hidden = loadHidden();

  function loadHidden() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
  }
  function saveHidden() {
    try { localStorage.setItem(KEY, JSON.stringify([...hidden])); } catch { /* conveniência apenas */ }
  }

  function mount(root) {
    const map = App.data.heists.cayo.map;
    const inner = h('div', { class: 'map' }, h('img', { src: map.image, alt: 'Mapa de Cayo Perico', draggable: 'false' }));
    const tip = h('div', { class: 'map-tip', hidden: true });
    const viewport = h('div', { class: 'map-viewport info' }, inner, zoomControls(inner, () => { tip.hidden = true; }), tip);

    function drawPoints() {
      for (const el of inner.querySelectorAll('.pin')) el.remove();
      for (const layer of map.layers) {
        if (hidden.has(layer.id)) continue;
        for (const pt of layer.points) {
          const pin = h('span', { class: `pin ${pt.locked ? 'locked' : ''}` }, layer.glyph || '');
          pin.style.left = `${(pt.x / map.width) * 100}%`;
          pin.style.top = `${(pt.y / map.height) * 100}%`;
          pin.style.setProperty('--pin', layer.color);
          pin.addEventListener('mouseenter', () => {
            const vr = viewport.getBoundingClientRect();
            const pr = pin.getBoundingClientRect();
            tip.replaceChildren(h('b', null, pt.label), h('span', null, layer.name), pt.locked ? h('span', { class: 'warn' }, 'Sala trancada') : null);
            tip.style.left = `${pr.left - vr.left + pr.width / 2}px`;
            tip.style.top = `${pr.top - vr.top}px`;
            tip.hidden = false;
          });
          pin.addEventListener('mouseleave', () => { tip.hidden = true; });
          inner.append(pin);
        }
      }
    }

    const filters = h('div', { class: 'map-filters' });
    function drawFilters() {
      UI.fill(filters,
        h('div', { class: 'filters-head' }, h('span', null, 'Filtros'),
          h('button', { class: 'btn ghost xs', onclick: () => { hidden = hidden.size ? new Set() : new Set(map.layers.map(l => l.id)); saveHidden(); drawFilters(); drawPoints(); } },
            hidden.size ? 'Mostrar tudo' : 'Esconder tudo')),
        map.layers.map(layer => {
          const swatch = h('i', { class: 'swatch' }, layer.glyph || '');
          swatch.style.setProperty('--pin', layer.color);
          return h('label', { class: 'filter-row', title: layer.note || '' },
            h('input', { type: 'checkbox', class: 'check', checked: !hidden.has(layer.id), onchange: e => {
              if (e.target.checked) hidden.delete(layer.id); else hidden.add(layer.id);
              saveHidden();
              drawPoints();
            } }),
            swatch,
            h('span', { class: 'grow' }, layer.name),
            h('span', { class: 'count' }, String(layer.points.length)));
        }),
        h('div', { class: 'filters-notes' }, map.layers.filter(l => l.note).map(l => h('p', null, h('b', null, `${l.name}: `), l.note))));
    }

    drawFilters();
    drawPoints();
    UI.fill(root,
      h('div', { class: 'map-layout' },
        h('div', { class: 'card pad map-card' }, viewport,
          h('p', { class: 'muted small map-help' }, 'Roda do mouse dá zoom, arraste pra mover, passe o mouse num ponto pra ver o que é.')),
        h('div', { class: 'card pad' }, filters)));
  }

  // Wheel/buttons zoom (1x to 5x) and drag-to-pan for the main map. Spots keep their screen size.
  function zoomControls(inner, onMove) {
    const MAX = 5;
    let z = 1, tx = 0, ty = 0;
    const label = h('span', { class: 'zoom-level' }, '1x');
    function apply() {
      const w = inner.offsetWidth, hgt = inner.offsetHeight;
      z = Math.min(MAX, Math.max(1, z));
      tx = Math.min(0, Math.max(w - w * z, tx));
      ty = Math.min(0, Math.max(hgt - hgt * z, ty));
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
      inner.style.setProperty('--z', String(z));
      label.textContent = `${Math.round(z * 10) / 10}x`.replace('.', ',');
      inner.parentElement.classList.toggle('zoomed', z > 1);
    }
    // Zoom keeping the map point under (cx, cy) fixed, in viewport coordinates.
    function zoomAt(next, cx, cy) {
      const px = (cx - tx) / z, py = (cy - ty) / z;
      z = Math.min(MAX, Math.max(1, next));
      tx = cx - px * z;
      ty = cy - py * z;
      apply();
      onMove();
    }
    const center = () => [inner.offsetWidth / 2, inner.offsetHeight / 2];
    const local = e => { const r = inner.parentElement.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    requestAnimationFrame(() => {
      const vp = inner.parentElement;
      vp.addEventListener('wheel', e => { e.preventDefault(); zoomAt(z * (e.deltaY < 0 ? 1.25 : 0.8), ...local(e)); }, { passive: false });
      vp.addEventListener('dblclick', e => { if (!e.target.closest('.pin, .zoom-tools')) zoomAt(z * 1.6, ...local(e)); });
      let drag = null;
      vp.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('.zoom-tools')) return;
        drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false, id: e.pointerId };
      });
      vp.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 5) return;
        if (!drag.moved) { drag.moved = true; vp.setPointerCapture(e.pointerId); vp.classList.add('panning'); onMove(); }
        tx = drag.tx + dx;
        ty = drag.ty + dy;
        apply();
      });
      const end = () => {
        if (drag && drag.moved) {
          // Swallow the click that ends a drag so it doesn't open a spot menu.
          vp.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
          setTimeout(() => vp.classList.remove('panning'), 0);
        }
        drag = null;
      };
      vp.addEventListener('pointerup', end);
      vp.addEventListener('pointercancel', end);
      new ResizeObserver(apply).observe(inner);
    });

    return h('div', { class: 'zoom-tools' },
      h('button', { title: 'Aproximar (ou roda do mouse)', onclick: () => zoomAt(z * 1.5, ...center()) }, '+'),
      label,
      h('button', { title: 'Afastar', onclick: () => zoomAt(z / 1.5, ...center()) }, '−'),
      h('button', { class: 'reset', title: 'Ver o mapa todo', onclick: () => { z = 1; tx = 0; ty = 0; apply(); onMove(); } }, 'Todo'));
  }

  window.CayoMap = { mount };
})();
