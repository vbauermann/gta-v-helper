// "Mapa" tab of the Cayo Perico page: informative map mirroring cayoperico.online. Groups and
// categories (filters), points, icons and screenshots come from data/cayo-map.json (built by
// tools/build-cayo-map.cjs). Like the site, scout items can be marked "Achei" or "Não está aqui";
// those marks live only in this browser storage. Wheel zoom and drag-to-pan.
(function () {
  'use strict';
  const { h, icon } = UI;
  const KEY = 'gta-helper.cayo-map.v2';
  const HI_RES_AT = 2; // zoom level that swaps in the 8192 px image
  let prefs = load();

  function load() {
    const base = { groups: {}, off: [], found: [], gone: [] };
    try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* conveniência apenas */ }
  }
  const groupOn = g => (g.id in prefs.groups ? prefs.groups[g.id] : g.defaultVisible);
  const toggleIn = (list, id, on) => { const s = new Set(prefs[list]); if (on) s.add(id); else s.delete(id); prefs[list] = [...s]; };

  function mount(root) {
    const map = App.data.heists.cayo.map;
    const cats = new Map(map.groups.flatMap(g => g.categories.map(c => [c.id, { ...c, group: g }])));
    const pointsOf = id => map.points.filter(p => p.category === id);
    const foundIn = id => pointsOf(id).filter(p => prefs.found.includes(p.id)).length;
    const title = p => p.name || cats.get(p.category).title;

    const img = h('img', { src: map.images[0].src, alt: 'Mapa de Cayo Perico', draggable: 'false' });
    const inner = h('div', { class: 'map' }, img);
    const tip = h('div', { class: 'map-tip', hidden: true });
    const pop = h('div', { class: 'map-pop', hidden: true });
    let openId = null;
    const closePop = () => { pop.hidden = true; openId = null; for (const el of inner.querySelectorAll('.pin.open')) el.classList.remove('open'); };
    let hiRes = false;
    const onZoom = z => {
      if (hiRes || z < HI_RES_AT || !map.images[1]) return;
      hiRes = true;
      const big = new Image();
      big.onload = () => { img.src = big.src; };
      big.src = map.images[1].src;
    };
    const viewport = h('div', { class: 'map-viewport info cayo' }, inner,
      zoomControls(inner, () => { tip.hidden = true; closePop(); }, onZoom), tip, pop);

    function drawPoints() {
      for (const el of inner.querySelectorAll('.pin')) el.remove();
      for (const p of map.points) {
        const cat = cats.get(p.category);
        if (!groupOn(cat.group) || prefs.off.includes(cat.id) || prefs.gone.includes(p.id)) continue;
        const found = prefs.found.includes(p.id);
        const done = cat.lookingFor && !found && foundIn(cat.id) >= cat.lookingFor;
        const pin = h('button', { type: 'button', class: `pin icon-pin${found ? ' found' : ''}${done ? ' done' : ''}${p.id === openId ? ' open' : ''}`, 'aria-label': title(p) },
          h('img', { src: found && cat.foundIcon ? cat.foundIcon : p.icon, alt: '', draggable: 'false' }));
        pin.style.left = `${p.x * 100}%`;
        pin.style.top = `${p.y * 100}%`;
        pin.addEventListener('mouseenter', () => {
          if (openId === p.id) return;
          tip.replaceChildren(h('b', null, title(p)), h('span', null, p.name ? cat.title : p.place || ''));
          place(tip, pin);
          tip.hidden = false;
        });
        pin.addEventListener('mouseleave', () => { tip.hidden = true; });
        pin.addEventListener('click', e => { e.stopPropagation(); tip.hidden = true; openPop(p, pin); });
        inner.append(pin);
      }
    }

    function place(el, pin) {
      const vr = viewport.getBoundingClientRect();
      const pr = pin.getBoundingClientRect();
      el.style.left = `${pr.left - vr.left + pr.width / 2}px`;
      el.style.top = `${pr.top - vr.top}px`;
    }

    function description(text) {
      const out = [];
      let list = null;
      for (const line of text.split('\n')) {
        if (line.startsWith('- ')) {
          if (!list) out.push(list = h('ul'));
          list.append(h('li', null, line.slice(2)));
        } else { list = null; out.push(h('p', null, line)); }
      }
      return out;
    }

    function openPop(p, pin) {
      const cat = cats.get(p.category);
      openId = p.id;
      for (const el of inner.querySelectorAll('.pin.open')) el.classList.remove('open');
      pin.classList.add('open');
      const found = prefs.found.includes(p.id);
      const mark = (list, on) => { toggleIn(list, p.id, on); save(); closePop(); drawPoints(); drawFilters(); };
      UI.fill(pop,
        h('div', { class: 'pop-head' },
          h('img', { src: p.icon, alt: '' }),
          h('div', { class: 'grow' }, h('b', null, title(p)), h('span', null, p.name ? [cat.title, p.place].filter(Boolean).join(' · ') : p.place || '')),
          h('button', { class: 'btn ghost xs', title: 'Fechar (Esc)', onclick: closePop }, icon('x', 14))),
        h('img', { class: 'pop-shot', src: p.screenshot, alt: `Foto de ${title(p)}`, draggable: 'false' }),
        p.locked ? h('p', { class: 'warn small' }, 'Esta sala só abre com 2 jogadores.') : null,
        p.description && !p.locked ? h('div', { class: 'pop-text' }, description(p.description)) : null,
        cat.trackFound || cat.canHide
          ? h('div', { class: 'pop-actions' },
            cat.trackFound ? h('button', { class: `btn ${found ? 'secondary' : 'primary'} sm`, onclick: () => mark('found', !found) }, found ? 'Desmarcar' : 'Achei!') : null,
            cat.canHide ? h('button', { class: 'btn ghost sm', onclick: () => { toggleIn('found', p.id, false); mark('gone', true); } }, 'Não está aqui') : null)
          : null);
      pop.hidden = false;
      // Above the pin when it fits, else below; always inside the viewport.
      const position = () => {
        const vr = viewport.getBoundingClientRect();
        const pr = pin.getBoundingClientRect();
        const px = pr.left - vr.left + pr.width / 2, top = pr.top - vr.top, bottom = pr.bottom - vr.top;
        const w = pop.offsetWidth, ph = pop.offsetHeight, m = 8;
        pop.style.left = `${Math.min(vr.width - w - m, Math.max(m, px - w / 2))}px`;
        pop.style.top = `${top - ph - 10 >= m ? top - ph - 10 : Math.max(m, Math.min(vr.height - ph - m, bottom + 10))}px`;
      };
      position();
      const shot = pop.querySelector('.pop-shot');
      if (!shot.complete) shot.addEventListener('load', () => { if (openId === p.id) position(); }, { once: true });
    }

    const filters = h('div', { class: 'map-filters' });
    function drawFilters() {
      const marks = prefs.found.length + prefs.gone.length;
      UI.fill(filters,
        h('div', { class: 'filters-head' }, h('span', null, 'Filtros'),
          marks ? h('button', { class: 'btn ghost xs', title: 'Apaga os "Achei" e "Não está aqui" pra começar outro scout',
            onclick: () => { prefs.found = []; prefs.gone = []; save(); closePop(); drawFilters(); drawPoints(); } }, `Limpar marcações (${marks})`) : null),
        map.groups.map(g => {
          const on = groupOn(g);
          return h('div', { class: `filter-group${on ? '' : ' off'}` },
            h('label', { class: 'group-row' },
              h('span', { class: 'grow' }, g.title),
              h('input', { type: 'checkbox', class: 'switch', checked: on, onchange: e => {
                prefs.groups[g.id] = e.target.checked;
                save(); closePop(); drawFilters(); drawPoints();
              } })),
            g.categories.map(c => {
              const pts = pointsOf(c.id);
              const left = pts.filter(p => !prefs.gone.includes(p.id)).length;
              const count = c.lookingFor ? `${foundIn(c.id)}/${c.lookingFor}` : String(left);
              return h('label', { class: 'filter-row', title: c.note || '' },
                h('input', { type: 'checkbox', class: 'check', checked: !prefs.off.includes(c.id), disabled: !on, onchange: e => {
                  toggleIn('off', c.id, !e.target.checked);
                  save(); closePop(); drawPoints();
                } }),
                h('img', { class: 'cat-img', src: c.icon, alt: '' }),
                h('span', { class: 'grow' }, c.title),
                h('span', { class: `count${c.lookingFor && foundIn(c.id) >= c.lookingFor ? ' complete' : ''}`,
                  title: c.lookingFor ? `Achou ${foundIn(c.id)} de ${c.lookingFor} (${left} locais possíveis)` : `${left} locais` }, count));
            }));
        }),
        h('p', { class: 'filters-notes' }, 'Clique num ponto pra ver a foto e o que é. Nos itens de scout, marque "Achei!" ou "Não está aqui" pra ir eliminando locais. Fonte: cayoperico.online.'));
    }

    viewport.addEventListener('click', e => { if (!e.target.closest('.map-pop')) closePop(); });
    const onKey = e => {
      if (!viewport.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape') closePop();
    };
    document.addEventListener('keydown', onKey);

    drawFilters();
    drawPoints();
    UI.fill(root,
      h('div', { class: 'map-layout' },
        h('div', { class: 'card pad map-card' }, viewport,
          h('p', { class: 'muted small map-help' }, 'Roda do mouse dá zoom, arraste pra mover, clique num ponto pra ver a foto.')),
        h('div', { class: 'card pad' }, filters)));
  }

  // Wheel/buttons zoom (1x to 8x) and drag-to-pan. Pins keep their screen size.
  function zoomControls(inner, onMove, onZoom) {
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
