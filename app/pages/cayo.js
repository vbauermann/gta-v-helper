(function () {
  'use strict';
  const { h, money, pct, number, field, numberInput, select, checkbox } = UI;
  const KEY = 'gta-helper.cayo';
  const DEFAULT_CUTS = { 1: [100], 2: [85, 15], 3: [70, 15, 15], 4: [55, 15, 15, 15] };
  let root = null;
  let results = null;
  let form = load();

  function load() {
    const base = { primaryId: 'diamond', hard: false, crewSize: 1, cuts: [100], found: {}, safe: 0, elite: false };
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

    results = h('div', { class: 'results' });
    root.replaceChildren(
      h('div', { class: 'page-head' },
        h('h1', null, 'Cayo Perico'),
        h('p', { class: 'muted' }, 'Marque os alvos secundários que achou no scout. O plano enche as bolsas com o que vale mais por espaço.')),
      h('div', { class: 'two-col' },
        h('div', { class: 'card form' },
          h('h3', null, 'Golpe'),
          field('Alvo principal', select(data.primaries.map(p => ({ value: p.id, label: `${p.name} · ${money(p.value)}` })), form.primaryId,
            { onchange: e => update({ primaryId: e.target.value }) })),
          checkbox('Modo difícil (+10% no alvo principal)', form.hard, e => update({ hard: e.target.checked })),
          field('Jogadores', select([1, 2, 3, 4].map(n => ({ value: String(n), label: String(n) })), String(form.crewSize), {
            onchange: e => {
              const n = Number(e.target.value);
              form.cuts = DEFAULT_CUTS[n].slice();
              update({ crewSize: n });
              renderCuts();
            }
          })),
          cutsBox,
          h('h3', null, 'Alvos secundários encontrados (pilhas)'),
          h('div', { class: 'stacks' }, data.secondaries.map(s => field(
            `${s.name} · ${money(s.stackValue)} · ${number(s.bagPct)}% da bolsa${s.needsTwo ? ' · precisa de 2 jogadores' : ''}`,
            numberInput(form.found[s.id] || 0, { min: 0, max: 30, step: 1, oninput: e => { form.found[s.id] = Math.max(0, Number(e.target.value) || 0); update({}); } })))),
          field('Cofre do El Rubio', numberInput(form.safe, { min: 0, step: 1000, oninput: e => update({ safe: Number(e.target.value) || 0 }) }), 'Entre GTA$ 18 mil e 99 mil, não ocupa bolsa.'),
          checkbox('Elite Challenge (menos de 15 min, bolsas cheias, sem falhar hack)', form.elite, e => update({ elite: e.target.checked }))),
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
      h('div', { class: 'card' },
        h('h3', null, 'Plano das bolsas'),
        r.bags.picks.length
          ? h('table', null,
            h('thead', null, h('tr', null, h('th', null, 'Alvo'), h('th', null, 'Pilhas'), h('th', null, 'Bolsa'), h('th', null, 'Valor'))),
            h('tbody', null, r.bags.picks.map(p => h('tr', null, h('td', null, p.name), h('td', null, number(p.stacks)), h('td', null, pct(p.bagPct)), h('td', null, money(p.value))))))
          : h('p', { class: 'muted' }, 'Nenhum secundário marcado.'),
        h('p', { class: 'muted' }, `Bolsas usadas: ${pct(r.bags.usedPct)} de ${pct(r.bags.capacityPct)}.`),
        r.bags.skipped.length ? h('p', { class: 'warn' }, 'Ouro ignorado: a sala do ouro no complexo precisa de 2 jogadores.') : null),
      h('div', { class: 'card' },
        h('h3', null, 'Pagamento'),
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
      h('div', { class: 'card' },
        h('h3', null, 'Cooldown'),
        cd
          ? h('div', { class: 'row' }, h('span', { class: 'strong', dataset: { live: 'cooldown' } }, ''), h('button', { onclick: () => App.act(window.gta.cayoCooldown(null)) }, 'Cancelar'))
          : h('div', { class: 'row' },
            h('button', { class: 'primary', onclick: () => App.act(window.gta.cayoCooldown(r.cooldownMinutes)) },
              `Terminei o golpe: iniciar cooldown (${r.cooldownMinutes} min)`)),
        h('p', { class: 'muted' }, 'Solo: 144 min reais. Em grupo: 48 min.')));
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
