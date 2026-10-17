// "Mapa" page: Los Santos map with properties, businesses, garages and wildlife photography spots
// (data/ls-map.json, built by tools/build-ls-map.cjs). Places marked "Tenho" live in the app state
// (state.map.owned) and MC businesses/Bunker also flip "Tenho este" on the Negócios page.
// Filter choices are a per-screen convenience in localStorage.
(function () {
  'use strict';
  const { h, icon } = UI;
  const KEY = 'gta-helper.ls-map.v1';
  const HI_RES_AT = 2;
  const START = { z: 2.2, x: 0.46, y: 0.72 }; // opens on the city
  const startsOff = c => c.id.startsWith('animal-');
  let prefs = load();
  let redraw = null;

  function load() {
    const base = { groups: {}, off: [], on: [], mine: false };
    try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* conveniência apenas */ }
  }
  const groupOn = g => (g.id in prefs.groups ? prefs.groups[g.id] : g.defaultVisible);
  const catOn = c => (startsOff(c) ? prefs.on.includes(c.id) : !prefs.off.includes(c.id));
  const setCat = (c, on) => {
    const list = startsOff(c) ? 'on' : 'off';
    const s = new Set(prefs[list]);
    if (on === (list === 'on')) s.add(c.id); else s.delete(c.id);
    prefs[list] = [...s];
  };
  const owned = () => new Set((App.state.map && App.state.map.owned) || []);
  const ownable = c => c.owns !== undefined && !startsOff(c) && c.id !== 'tourist-board';

  function mount(root) {
    const map = App.data.lsMap;
    const cats = new Map(map.groups.flatMap(g => g.categories.map(c => [c.id, { ...c, group: g }])));
    const pointsOf = id => map.points.filter(p => p.category === id);
    const title = p => p.name || cats.get(p.category).title;
    const sub = p => [p.name ? cats.get(p.category).title : null, p.place].filter(Boolean).join(' · ');

    const img = h('img', { src: map.images[0].src, alt: 'Mapa de Los Santos', draggable: 'false' });
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
    const viewport = h('div', { class: 'map-viewport info ls' }, inner,
      MapZoom.controls(inner, () => { tip.hidden = true; closePop(); }, onZoom, START), tip, pop);
    viewport.style.aspectRatio = inner.style.aspectRatio = String(map.aspect);

    function drawPoints() {
      for (const el of inner.querySelectorAll('.pin')) el.remove();
      tip.hidden = true;
      const mine = owned();
      for (const p of map.points) {
        const cat = cats.get(p.category);
        const have = mine.has(p.id);
        if (prefs.mine ? !have : (!groupOn(cat.group) || !catOn(cat))) continue;
        const pin = h('button', { type: 'button', class: `pin icon-pin${have ? ' owned' : ''}${startsOff(cat) ? ' small' : ''}${p.id === openId ? ' open' : ''}`, 'aria-label': title(p) },
          h('img', { src: cat.icon, alt: '', draggable: 'false' }));
        pin.style.left = `${p.x * 100}%`;
        pin.style.top = `${p.y * 100}%`;
        pin.addEventListener('mouseenter', () => {
          if (openId === p.id) return;
          tip.replaceChildren(h('b', null, title(p)), h('span', null, have ? `${sub(p)} · você tem` : sub(p)));
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

    function openPop(p, pin) {
      const cat = cats.get(p.category);
      openId = p.id;
      for (const el of inner.querySelectorAll('.pin.open')) el.classList.remove('open');
      pin.classList.add('open');
      const have = owned().has(p.id);
      const others = cat.owns ? pointsOf(cat.id).filter(q => q.id !== p.id && owned().has(q.id)) : [];
      const replaces = !have && cat.owns === 1 && others.length ? others[0] : null;
      const hint = cat.business
        ? 'Marcar aqui também marca "Tenho este" na tela de Negócios.'
        : replaces ? `No jogo só dá pra ter 1. Marcar este desmarca ${title(replaces)}.` : cat.note || null;
      UI.fill(pop,
        h('div', { class: 'pop-head' },
          h('img', { src: cat.icon, alt: '' }),
          h('div', { class: 'grow' }, h('b', null, title(p)), h('span', null, sub(p))),
          h('button', { class: 'btn ghost xs', title: 'Fechar (Esc)', onclick: closePop }, icon('x', 14))),
        startsOff(cat) ? h('p', { class: 'muted small' }, 'Lugar onde o animal pode aparecer. Fotografe com o celular do jogo.') : null,
        ownable(cat) ? h('p', { class: 'muted small' }, hint) : null,
        ownable(cat)
          ? h('div', { class: 'pop-actions' },
            h('button', { class: `btn ${have ? 'secondary' : 'primary'} sm`, onclick: () => { closePop(); App.act(window.gta.mapOwn(p.id, !have)); } },
              have ? 'Não tenho mais' : 'Tenho este'))
          : null);
      pop.hidden = false;
      const vr = viewport.getBoundingClientRect();
      const pr = pin.getBoundingClientRect();
      const px = pr.left - vr.left + pr.width / 2, top = pr.top - vr.top, bottom = pr.bottom - vr.top;
      const w = pop.offsetWidth, ph = pop.offsetHeight, m = 8;
      pop.style.left = `${Math.min(vr.width - w - m, Math.max(m, px - w / 2))}px`;
      pop.style.top = `${top - ph - 10 >= m ? top - ph - 10 : Math.max(m, Math.min(vr.height - ph - m, bottom + 10))}px`;
    }

    const filters = h('div', { class: 'map-filters' });
    function drawFilters() {
      const mine = owned();
      const ownedIn = id => pointsOf(id).filter(p => mine.has(p.id)).length;
      UI.fill(filters,
        h('div', { class: 'filters-head' }, h('span', null, 'Filtros')),
        h('label', { class: 'group-row mine-row', title: 'Mostra só os lugares que você marcou, como o mapa do seu jogo' },
          h('span', { class: 'grow' }, `Só os meus (${mine.size})`),
          h('input', { type: 'checkbox', class: 'switch', checked: prefs.mine, onchange: e => {
            prefs.mine = e.target.checked;
            save(); closePop(); drawFilters(); drawPoints();
          } })),
        map.groups.map(g => {
          const on = groupOn(g) && !prefs.mine;
          return h('div', { class: `filter-group${on ? '' : ' off'}` },
            h('label', { class: 'group-row' },
              h('span', { class: 'grow' }, g.title),
              h('input', { type: 'checkbox', class: 'switch', checked: groupOn(g), disabled: prefs.mine, onchange: e => {
                prefs.groups[g.id] = e.target.checked;
                save(); closePop(); drawFilters(); drawPoints();
              } })),
            g.note && on ? h('p', { class: 'filters-notes group-note' }, g.note) : null,
            g.categories.map(c => {
              const n = pointsOf(c.id).length, have = ownedIn(c.id);
              const count = ownable(c) && have ? (c.owns ? `${have}/${c.owns}` : `${have} de ${n}`) : String(n);
              return h('label', { class: 'filter-row', title: c.note || '' },
                h('input', { type: 'checkbox', class: 'check', checked: catOn(c), disabled: !on, onchange: e => {
                  setCat(c, e.target.checked);
                  save(); closePop(); drawPoints();
                } }),
                h('img', { class: 'cat-img', src: c.icon, alt: '' }),
                h('span', { class: 'grow' }, c.title),
                h('span', { class: `count${have ? ' complete' : ''}`, title: have ? `Você tem ${have}` : `${n} locais` }, count));
            }));
        }),
        h('p', { class: 'filters-notes' }, 'Passe o mouse num ponto pra ver o nome (nas garagens é o nome do fast travel). Clique pra marcar o que você tem. Fonte das posições: gtaweb.eu.'));
    }

    viewport.addEventListener('click', e => { if (!e.target.closest('.map-pop')) closePop(); });
    const onKey = e => {
      if (!viewport.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape') closePop();
    };
    document.addEventListener('keydown', onKey);
    redraw = () => { drawFilters(); drawPoints(); };

    drawFilters();
    drawPoints();
    UI.fill(root,
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Mapa de Los Santos'))),
      h('div', { class: 'map-layout' },
        h('div', { class: 'card pad map-card' }, viewport,
          h('p', { class: 'muted small map-help' }, 'Roda do mouse dá zoom, arraste pra mover, "Todo" mostra o mapa inteiro.')),
        h('div', { class: 'card pad' }, filters)));
  }

  window.Pages = window.Pages || {};
  let root = null, shown = '';
  window.Pages.map = {
    mount(el) { root = el; shown = JSON.stringify(App.state.map); mount(el); },
    onState(s) {
      if (!root || !root.isConnected || !redraw) return;
      const now = JSON.stringify(s.map);
      if (now === shown) return;
      shown = now;
      redraw();
    }
  };
})();
