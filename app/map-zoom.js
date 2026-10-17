// Shared zoom and pan for the maps (Cayo Perico and Los Santos).
(function () {
  'use strict';
  const { h } = UI;

  // Wheel/buttons zoom (1x to 8x) and drag-to-pan. Pins keep their screen size.
  // start: optional { z, x, y } to open zoomed on a point (x, y as 0..1 of the map).
  function controls(inner, onMove, onZoom, start) {
    const MAX = 8;
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
      onZoom(z);
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
      vp.addEventListener('wheel', e => {
        if (e.target.closest('.map-pop')) return;
        e.preventDefault();
        zoomAt(z * (e.deltaY < 0 ? 1.25 : 0.8), ...local(e));
      }, { passive: false });
      vp.addEventListener('dblclick', e => { if (!e.target.closest('.pin, .zoom-tools, .map-pop')) zoomAt(z * 1.6, ...local(e)); });
      let drag = null;
      vp.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('.zoom-tools, .map-pop')) return;
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
          // Swallow the click that ends a drag so it doesn't open a point.
          vp.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
          setTimeout(() => vp.classList.remove('panning'), 0);
        }
        drag = null;
      };
      vp.addEventListener('pointerup', end);
      vp.addEventListener('pointercancel', end);
      if (start) {
        z = start.z;
        tx = vp.offsetWidth / 2 - start.x * inner.offsetWidth * z;
        ty = vp.offsetHeight / 2 - start.y * inner.offsetHeight * z;
        apply();
      }
      new ResizeObserver(apply).observe(inner);
    });

    return h('div', { class: 'zoom-tools' },
      h('button', { title: 'Aproximar (ou roda do mouse)', onclick: () => zoomAt(z * 1.5, ...center()) }, '+'),
      label,
      h('button', { title: 'Afastar', onclick: () => zoomAt(z / 1.5, ...center()) }, '−'),
      h('button', { class: 'reset', title: 'Ver o mapa todo', onclick: () => { z = 1; tx = 0; ty = 0; apply(); onMove(); } }, 'Todo'));
  }

  window.MapZoom = { controls };
})();
