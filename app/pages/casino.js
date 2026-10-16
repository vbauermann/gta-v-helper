(function () {
  'use strict';
  const { h, money, field, numberInput, select, checkbox, segmented, icon } = UI;
  const KEY = 'gta-helper.casino';
  const DEFAULT_CUTS = { 1: [100], 2: [85, 15], 3: [70, 15, 15], 4: [55, 15, 15, 15] };
  const ROLE_LABELS = { gunman: 'Atirador', driver: 'Motorista', hacker: 'Hacker' };
  let root = null;
  let results = null;
  let form = load();

  function load() {
    const base = { targetId: 'diamonds', hard: false, take: 0, firstWeekly: false, buyer: 'high', crewPct: { gunman: 5, driver: 5, hacker: 10 }, crewSize: 2, cuts: [85, 15] };
    try {
      const saved = { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
      if (saved.crewSize < 2) Object.assign(saved, { crewSize: 2, cuts: DEFAULT_CUTS[2].slice() });
      return saved;
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

  function render() {
    const data = App.data.heists.casino;
    const cutsBox = h('div', { class: 'cuts' });
    const renderCuts = () => cutsBox.replaceChildren(...form.cuts.map((c, i) => field(i === 0 ? 'Líder (%)' : `Jogador ${i + 1} (%)`,
      numberInput(c, { min: 0, max: 100, step: 5, oninput: e => { form.cuts[i] = Number(e.target.value) || 0; update({}); } }))));
    renderCuts();
    results = h('div', { class: 'results' });
    root.replaceChildren(
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Diamond Casino'),
          h('div', { class: 'sub' }, 'Valores base da atualização de economia. Hacker melhor dá mais tempo no cofre, mas cobra mais.'))),
      h('div', { class: 'two-col' },
        h('div', { class: 'card pad form' },
          h('div', { class: 'card-head' }, h('h3', null, icon('casino', 18), 'Golpe')),
          field('Alvo do cofre', select(data.targets.map(t => ({ value: t.id, label: `${t.name} · ${money(t.value)}` })), form.targetId,
            { onchange: e => update({ targetId: e.target.value }) })),
          checkbox('Modo difícil (+10%)', form.hard, e => update({ hard: e.target.checked })),
          checkbox(`Primeira conclusão da semana (x${String(data.weeklyMultiplier).replace('.', ',')})`, form.firstWeekly, e => update({ firstWeekly: e.target.checked })),
          field('Quanto você pegou de fato (opcional)', numberInput(form.take || '', { min: 0, step: 1000, placeholder: 'máximo do alvo', oninput: e => update({ take: Number(e.target.value) || 0 }) }),
            'Deixe vazio para calcular com o máximo do cofre.'),
          h('div', { class: 'form-grid' },
          field('Comprador', select([
            { value: 'low', label: 'Nível baixo (-10%)' }, { value: 'mid', label: 'Nível médio (-5%)' }, { value: 'high', label: 'Nível alto (0%)' }
          ], form.buyer, { onchange: e => update({ buyer: e.target.value }) })),
          Object.keys(ROLE_LABELS).map(role => field(ROLE_LABELS[role], select(
            data.crew[role].map(c => ({ value: String(c.pct), label: `${c.name} (${c.pct}%)` })), String(form.crewPct[role]),
            { onchange: e => update({ crewPct: { ...form.crewPct, [role]: Number(e.target.value) } }) })))),
          field('Jogadores', segmented([2, 3, 4].map(n => ({ value: n, label: String(n) })), form.crewSize, n => {
            form.cuts = DEFAULT_CUTS[n].slice();
            update({ crewSize: n });
            renderCuts();
          }), 'O Casino exige pelo menos 2 jogadores.'),
          cutsBox),
        results));
    renderResults();
  }

  function renderResults() {
    if (!results) return;
    const r = GtaHeists.casino(App.data.heists.casino, form);
    const total = GtaHeists.cutsTotal(form.cuts);
    results.replaceChildren(h('div', { class: 'card pad' },
      h('div', { class: 'card-head' }, h('h3', null, icon('dollar', 18), 'Pagamento')),
      h('dl', { class: 'sums' },
        h('dt', null, `${r.target} (potencial)`), h('dd', null, money(r.potential)),
        h('dt', null, 'Pego no cofre'), h('dd', null, money(r.take)),
        r.weekly !== 1 ? [h('dt', null, `Bônus semanal (x${String(r.weekly).replace('.', ',')})`), h('dd', null, money(r.gross))] : null,
        r.fees.map(f => [h('dt', null, `${f.name} (${f.pct}%)`), h('dd', { class: 'neg' }, `- ${money(f.value)}`)]),
        h('dt', { class: 'strong' }, 'Líquido para o grupo'), h('dd', { class: 'strong' }, money(r.net))),
      total !== 100 ? h('p', { class: 'warn' }, `Os cortes somam ${total}%, deveriam somar 100%.`) : null,
      h('table', null, h('tbody', null, r.players.map(p => h('tr', null,
        h('td', null, p.player === 1 ? 'Líder' : `Jogador ${p.player}`), h('td', null, `${p.pct}%`), h('td', { class: 'strong' }, money(p.value))))))));
  }

  window.Pages = window.Pages || {};
  window.Pages.casino = {
    mount(el) { root = el; render(); }
  };
})();
