(function () {
  'use strict';
  const { h, money, pct, number, field, numberInput, select, checkbox, segmented, icon } = UI;
  const head = (iconName, title, ...extra) => h('div', { class: 'card-head' }, h('h3', null, icon(iconName, 18), title), ...extra);
  const KEY = 'gta-helper.cayo';
  const DEFAULT_CUTS = { 1: [100], 2: [85, 15], 3: [70, 15, 15], 4: [55, 15, 15, 15] };
  let root = null;
  let results = null;
  let form = load();
  let body = null;
  let tab = 'heist';

  function load() {
    const base = { primaryId: 'diamond', hard: false, crewSize: 1, cuts: [100], found: {}, elite: false };
    try {
      const { markers, safe, ...saved } = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { ...base, ...saved };
    } catch { return base; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(form)); } catch { /* conveniência apenas */ }
  }

  function update(patch) {
    Object.assign(form, patch);
    save();
    renderResults();
  }

  // Quantity of stacks found in the scout: a 1-10 slider; clicking the current value clears it.
  function qtyPicker(id) {
    const box = h('div', { class: 'segmented qty' });
    const draw = () => {
      const v = form.found[id] || 0;
      box.replaceChildren(...Array.from({ length: 10 }, (_, i) => i + 1).map(n => h('button', {
        type: 'button', class: `${n <= v ? 'on' : ''}${n === v ? ' active' : ''}`,
        onclick: () => {
          form.found[id] = (form.found[id] || 0) === n ? 0 : n;
          draw();
          update({});
        }
      }, String(n))));
    };
    draw();
    return box;
  }

  function lootIcon(id) {
    return h('span', { class: `cat-icon loot loot-${id}` }, icon(`loot-${id}`, 20));
  }

  function render() {
    const data = App.data.heists.cayo;
    const cutsBox = h('div', { class: 'cuts' });
    const renderCuts = () => cutsBox.replaceChildren(...form.cuts.map((c, i) => field(i === 0 ? 'Líder (%)' : `Jogador ${i + 1} (%)`,
      numberInput(c, { min: 0, max: 100, step: 5, oninput: e => { form.cuts[i] = Number(e.target.value) || 0; update({}); } }))));
    renderCuts();

    results = h('div', { class: 'results' });
    UI.fill(body,
      h('p', { class: 'muted small tab-note' }, 'Marque quantas pilhas de cada alvo secundário você achou no scout. O plano enche as bolsas com o que vale mais por espaço.'),
      h('div', { class: 'two-col' },
        h('div', { class: 'left-col' },
          h('div', { class: 'card pad form' },
            head('cayo', 'Golpe'),
            field('Alvo principal', select(data.primaries.map(p => ({ value: p.id, label: `${p.name} · ${money(p.value)}` })), form.primaryId,
              { onchange: e => update({ primaryId: e.target.value }) })),
            checkbox('Modo difícil (+10% no alvo principal)', form.hard, e => update({ hard: e.target.checked })),
            checkbox('Elite Challenge', form.elite, e => update({ elite: e.target.checked }), 'Menos de 15 min, bolsas cheias e sem falhar hack.'),
            field('Jogadores', segmented([1, 2, 3, 4].map(n => ({ value: n, label: n === 1 ? 'Solo' : String(n) })), form.crewSize, n => {
              form.cuts = DEFAULT_CUTS[n].slice();
              update({ crewSize: n });
              renderCuts();
            })),
            cutsBox),
          h('div', { class: 'card pad' },
            head('bag', 'Alvos secundários', h('span', { class: 'hint' }, 'pilhas encontradas no scout')),
            h('div', { class: 'loot-rows' }, data.secondaries.map(s => h('div', { class: `loot-row loot-${s.id}`, title: s.name },
              lootIcon(s.id),
              h('div', { class: 'loot-main' },
                qtyPicker(s.id),
                h('div', { class: 'loot-hint' },
                  `Valor por pilha: ${money(s.stackValue)} | Ocupa da bolsa: ${number(s.bagPct)}%`))))))),
        results));
    renderResults();
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
    mount(el) {
      root = el;
      body = h('div', { class: 'tab-body' });
      const show = () => { results = null; if (tab === 'map') window.CayoMap.mount(body); else render(); };
      UI.fill(root,
        h('div', { class: 'page-head' },
          h('div', null,
            h('h1', null, 'Cayo Perico'),
            h('div', { class: 'tabs' }, segmented([{ value: 'heist', label: 'Golpe' }, { value: 'map', label: 'Mapa' }], tab, v => { tab = v; show(); })))),
        body);
      show();
    },
    onState(s, force) {
      if (!root || !root.isConnected || !results || !results.isConnected) return;
      const shown = !!results.querySelector('[data-live=cooldown]');
      if (force || shown !== !!s.cayoCooldownEndsAt) renderResults();
    },
    onSecond() { if (root && root.isConnected && results && results.isConnected) onSecond(); }
  };
})();
