(function () {
  'use strict';
  const { h, money, pct, number, field, numberInput, select, checkbox, segmented, icon } = UI;
  const head = (iconName, title, ...extra) => h('div', { class: 'card-head' }, h('h3', null, icon(iconName, 18), title), ...extra);
  const KEY = 'gta-helper.cayo';
  const DEFAULT_CUTS = { 1: [100], 2: [85, 15], 3: [70, 15, 15], 4: [55, 15, 15, 15] };
  let root = null;
  let results = null;
  let form = load();
  let renderStacks = () => {};
  const LOOT_SHORT = { gold: 'O', cocaine: 'C', weed: 'M', paintings: 'P', cash: '$' };

  function load() {
    const base = { primaryId: 'diamond', hard: false, crewSize: 1, cuts: [100], found: {}, markers: {}, safe: 0, elite: false };
    try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(form)); } catch { /* conveniência apenas */ }
  }

  function update(patch) {
    Object.assign(form, patch);
    save();
    renderResults();
  }

  function render() {
    const data = App.data.heists.cayo;
    const cutsBox = h('div', { class: 'cuts' });
    const renderCuts = () => cutsBox.replaceChildren(...form.cuts.map((c, i) => field(i === 0 ? 'Líder (%)' : `Jogador ${i + 1} (%)`,
      numberInput(c, { min: 0, max: 100, step: 5, oninput: e => { form.cuts[i] = Number(e.target.value) || 0; update({}); } }))));
    renderCuts();

    const stacksBox = h('div', { class: 'stacks' });
    renderStacks = () => stacksBox.replaceChildren(...data.secondaries.map(s => field(
      `${s.name} · ${money(s.stackValue)} · ${number(s.bagPct)}% da bolsa${s.needsTwo ? ' · precisa de 2 jogadores' : ''}`,
      numberInput(form.found[s.id] || 0, { min: 0, max: 30, step: 1, oninput: e => { form.found[s.id] = Math.max(0, Number(e.target.value) || 0); update({}); } }))));
    renderStacks();

    results = h('div', { class: 'results' });
    UI.fill(root, 
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Cayo Perico'),
          h('div', { class: 'sub' }, 'Marque os alvos secundários que achou no scout. O plano enche as bolsas com o que vale mais por espaço.'))),
      mapCard(data),
      h('div', { class: 'two-col' },
        h('div', { class: 'card pad form' },
          head('cayo', 'Golpe'),
          field('Alvo principal', select(data.primaries.map(p => ({ value: p.id, label: `${p.name} · ${money(p.value)}` })), form.primaryId,
            { onchange: e => update({ primaryId: e.target.value }) })),
          checkbox('Modo difícil (+10% no alvo principal)', form.hard, e => update({ hard: e.target.checked })),
          field('Jogadores', segmented([1, 2, 3, 4].map(n => ({ value: n, label: n === 1 ? 'Solo' : String(n) })), form.crewSize, n => {
            form.cuts = DEFAULT_CUTS[n].slice();
            update({ crewSize: n });
            renderCuts();
          })),
          cutsBox,
          h('div', { class: 'divider' }),
          h('div', { class: 'form-title' }, 'Alvos secundários encontrados (pilhas)'),
          stacksBox,
          field('Cofre do El Rubio', numberInput(form.safe, { min: 0, step: 1000, oninput: e => update({ safe: Number(e.target.value) || 0 }) }), 'Entre GTA$ 18 mil e 99 mil, não ocupa bolsa.'),
          checkbox('Elite Challenge (menos de 15 min, bolsas cheias, sem falhar hack)', form.elite, e => update({ elite: e.target.checked }))),
        results));
    renderResults();
  }

  // Scout map: each spot holds one stack. Clicking a spot picks what was there and the
  // stack counts are recalculated from the map. The compound spots sit too close together
  // at this size, so they live in a zoomed inset next to the map.
  function mapCard(data) {
    const map = data.map;
    const inset = map.inset;
    const scale = 4;
    const main = h('div', { class: 'map' }, h('img', { src: map.image, alt: 'Mapa de Cayo Perico', draggable: 'false' }));
    const area = h('div', { class: 'map-area' });
    area.style.left = `${(inset.x / map.width) * 100}%`;
    area.style.top = `${(inset.y / map.height) * 100}%`;
    area.style.width = `${(inset.w / map.width) * 100}%`;
    area.style.height = `${(inset.h / map.height) * 100}%`;
    main.append(area);
    const zoomImg = h('img', { src: map.image, alt: '', draggable: 'false' });
    zoomImg.style.width = `${map.width * scale}px`;
    zoomImg.style.left = `${-inset.x * scale}px`;
    zoomImg.style.top = `${-inset.y * scale}px`;
    const zoom = h('div', { class: 'map zoom' }, zoomImg);
    zoom.style.width = `${inset.w * scale}px`;
    zoom.style.height = `${inset.h * scale}px`;
    const menu = h('div', { class: 'map-menu', hidden: true });
    let openSpot = null;

    function setMarker(spotId, loot) {
      if (loot) form.markers[spotId] = loot; else delete form.markers[spotId];
      const found = {};
      for (const id of Object.values(form.markers)) if (id !== 'empty') found[id] = (found[id] || 0) + 1;
      form.found = found;
      closeMenu();
      renderStacks();
      update({});
    }

    function closeMenu() {
      menu.hidden = true;
      openSpot = null;
      drawSpots();
    }

    function openMenu(spot, btn) {
      openSpot = spot.id;
      menu.replaceChildren(
        h('div', { class: 'map-menu-title' }, `${spot.area}${spot.locked ? ' · sala trancada' : ''}`),
        ...data.secondaries.map(s => h('button', { class: `loot-${s.id}`, onclick: () => setMarker(spot.id, s.id) }, s.name)),
        h('button', { class: 'loot-empty-opt', onclick: () => setMarker(spot.id, 'empty') }, 'Vazio'),
        h('button', { onclick: () => setMarker(spot.id, null) }, 'Desmarcar'));
      const box = scout.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      menu.style.left = `${Math.min(r.left - box.left + 16, box.width - 170)}px`;
      menu.style.top = `${Math.min(r.top - box.top + 16, box.height - 290)}px`;
      menu.hidden = false;
      drawSpots();
    }

    function drawSpots() {
      for (const el of scout.querySelectorAll('.spot')) el.remove();
      for (const spot of map.spots) {
        const loot = form.markers[spot.id];
        const btn = h('button', {
          class: `spot ${loot ? `loot-${loot}` : ''} ${spot.locked ? 'locked' : ''} ${openSpot === spot.id ? 'active' : ''}`,
          title: `${spot.area}${spot.locked ? ' (trancada)' : ''}`,
          onclick: e => { e.stopPropagation(); openMenu(spot, btn); }
        }, loot ? (loot === 'empty' ? '×' : LOOT_SHORT[loot]) : '?');
        if (spot.inset) {
          btn.style.left = `${((spot.x - inset.x) / inset.w) * 100}%`;
          btn.style.top = `${((spot.y - inset.y) / inset.h) * 100}%`;
          zoom.append(btn);
        } else {
          btn.style.left = `${(spot.x / map.width) * 100}%`;
          btn.style.top = `${(spot.y / map.height) * 100}%`;
          main.append(btn);
        }
      }
    }

    const scout = h('div', { class: 'scout' },
      main,
      h('div', { class: 'zoom-col' }, h('div', { class: 'muted small' }, inset.label), zoom),
      menu);
    scout.addEventListener('click', () => { if (!menu.hidden) closeMenu(); });
    drawSpots();
    return h('div', { class: 'card pad map-card' },
      head('cayo', 'Mapa do scout', h('span', { class: 'grow' }),
        h('button', { class: 'btn secondary sm', onclick: () => { form.markers = {}; form.found = {}; save(); render(); } }, icon('eraser', 15), 'Limpar mapa')),
      h('p', { class: 'muted small' }, `${map.note} Clique no ponto e escolha o que tinha lá. Se preferir, preencha só as quantidades no formulário.`),
      scout,
      h('div', { class: 'legend' }, data.secondaries.map(s => h('span', { class: `legend-item loot-${s.id}` }, h('i', null, LOOT_SHORT[s.id]), s.name))));
  }

  function renderResults() {
    if (!results) return;
    const data = App.data.heists.cayo;
    const r = GtaHeists.cayo(data, form);
    const total = GtaHeists.cutsTotal(form.cuts);
    const cd = App.state.cayoCooldownEndsAt;
    results.replaceChildren(
      h('div', { class: 'card pad' },
        head('bag', 'Plano das bolsas'),
        r.bags.picks.length
          ? h('table', null,
            h('thead', null, h('tr', null, h('th', null, 'Alvo'), h('th', null, 'Pilhas'), h('th', null, 'Bolsa'), h('th', null, 'Valor'))),
            h('tbody', null, r.bags.picks.map(p => h('tr', null, h('td', null, p.name), h('td', null, number(p.stacks)), h('td', null, pct(p.bagPct)), h('td', null, money(p.value))))))
          : h('p', { class: 'muted' }, 'Nenhum secundário marcado.'),
        h('p', { class: 'muted small' }, `Bolsas usadas: ${pct(r.bags.usedPct)} de ${pct(r.bags.capacityPct)}.`),
        r.bags.skipped.length ? h('p', { class: 'warn' }, 'Ouro ignorado: a sala do ouro no complexo precisa de 2 jogadores.') : null),
      h('div', { class: 'card pad' },
        head('dollar', 'Pagamento'),
        h('dl', { class: 'sums' },
          h('dt', null, r.primary), h('dd', null, money(r.primaryValue)),
          h('dt', null, 'Secundários'), h('dd', null, money(r.bags.value)),
          h('dt', null, 'Cofre'), h('dd', null, money(r.safe)),
          h('dt', null, 'Total bruto'), h('dd', null, money(r.gross)),
          h('dt', null, `Pavel e fence (${r.feePct}%)`), h('dd', { class: 'neg' }, `- ${money(r.fees)}`),
          h('dt', { class: 'strong' }, 'Líquido'), h('dd', { class: 'strong' }, money(r.net))),
        total !== 100 ? h('p', { class: 'warn' }, `Os cortes somam ${total}%, deveriam somar 100%.`) : null,
        h('table', null,
          h('tbody', null, r.players.map(p => h('tr', null,
            h('td', null, p.player === 1 ? 'Líder' : `Jogador ${p.player}`), h('td', null, `${p.pct}%`), h('td', { class: 'strong' }, money(p.value)))))),
        form.elite ? h('p', { class: 'muted' }, 'Inclui o bônus do Elite Challenge para cada jogador.') : null),
      h('div', { class: 'card pad' },
        head('clock', 'Cooldown', h('span', { class: 'hint' }, '(Solo: 144 min. Grupo: 48 min)')),
        cd
          ? h('div', { class: 'row' }, h('span', { class: 'strong', dataset: { live: 'cooldown' } }, ''), h('button', { class: 'btn ghost sm', onclick: () => App.act(window.gta.cayoCooldown(null)) }, 'Cancelar'))
          : h('div', { class: 'row' },
            h('button', { class: 'btn primary', onclick: () => App.act(window.gta.cayoCooldown(r.cooldownMinutes)) },
              `Terminei o golpe: iniciar cooldown (${r.cooldownMinutes} min)`))));
    onSecond();
  }

  function onSecond() {
    const el = results && results.querySelector('[data-live=cooldown]');
    const cd = App.state.cayoCooldownEndsAt;
    if (el && cd) el.textContent = `Libera em ${GtaProduction.formatMinutes((cd - Date.now()) / 60000)}`;
  }

  window.Pages = window.Pages || {};
  window.Pages.cayo = {
    mount(el) { root = el; render(); },
    onState(s, force) {
      if (!root || !root.isConnected || !results) return;
      const shown = !!results.querySelector('[data-live=cooldown]');
      if (force || shown !== !!s.cayoCooldownEndsAt) renderResults();
    },
    onSecond() { if (root && root.isConnected) onSecond(); }
  };
})();
