// Kortz Center: wiki tabs plus a calculator of what to put in each bag (secondary loot), like Cayo.
(function () {
  'use strict';
  const { h, money, pct, field, checkbox, segmented, icon } = UI;
  const head = (iconName, title, ...extra) => h('div', { class: 'card-head' }, h('h3', null, icon(iconName, 18), title), ...extra);
  const KEY = 'gta-helper.kortz';
  const ICON = {
    'crisp-painting': 'paintings', painting: 'paintings', 'vault-painting': 'paintings', crate: 'crate', gem: 'gem',
    case: 'statue', fertility: 'statue', egg: 'egg', circlets: 'ring', rings: 'ring', deposit: 'box'
  };
  let root = null;
  let body = null;
  let results = null;
  let tab = 'calc';
  let form = null;

  const typical = () => Object.fromEntries(App.data.heists.kortz.loot.map(l => [l.id, l.typical || 0]));
  function load() {
    const base = { hard: false, crewSize: 1, found: typical() };
    try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(form)); } catch { /* conveniência apenas */ } }
  function update(patch) { Object.assign(form, patch); save(); renderResults(); }

  // How many of each item the scout showed: 1-10; clicking the current value clears it.
  function qtyPicker(id) {
    const box = h('div', { class: 'segmented qty' });
    const draw = () => {
      const v = form.found[id] || 0;
      box.replaceChildren(...Array.from({ length: 10 }, (_, i) => i + 1).map(n => h('button', {
        type: 'button', class: `${n <= v ? 'on' : ''}${n === v ? ' active' : ''}`,
        onclick: () => { form.found[id] = (form.found[id] || 0) === n ? 0 : n; draw(); update({}); }
      }, String(n))));
    };
    draw();
    return box;
  }

  const range = (l, k) => `${money(l.min * k)} a ${money(l.max * k)}`;

  function render() {
    const data = App.data.heists.kortz;
    form = form || load();
    const k = form.hard ? 1 + data.hardBonusPct / 100 : 1;
    results = h('div', { class: 'results' });
    UI.fill(body,
      h('p', { class: 'muted small tab-note' }, 'Marque quantos de cada alvo secundário apareceram no scout (já vem com o que o prédio costuma ter). O plano escolhe o que levar em cada bolsa para dar mais dinheiro: cada item vai inteiro numa bolsa só.'),
      h('div', { class: 'two-col' },
        h('div', { class: 'left-col' },
          h('div', { class: 'card pad form' },
            head('frame', 'Golpe'),
            checkbox('Modo difícil (+10% nos secundários)', form.hard, e => { form.hard = e.target.checked; save(); render(); }),
            field('Jogadores', segmented([1, 2, 3, 4].map(n => ({ value: n, label: n === 1 ? 'Solo' : String(n) })), form.crewSize, n => update({ crewSize: n }))),
            h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { form.found = typical(); save(); render(); } }, 'Voltar às quantidades padrão')),
          h('div', { class: 'card pad' },
            head('bag', 'Alvos secundários', h('span', { class: 'hint' }, 'quantos achou no scout')),
            h('div', { class: 'loot-rows' }, data.loot.map(l => h('div', { class: `loot-row kl-${ICON[l.id]}`, title: l.hint },
              h('span', { class: 'cat-icon loot' }, icon(`loot-${ICON[l.id]}`, 20)),
              h('div', { class: 'loot-main' },
                h('div', { class: 'loot-name' }, l.name, l.needsTwo ? h('span', { class: 'loot-tag' }, 'Crisp Gallery, 2+ jogadores') : null),
                qtyPicker(l.id),
                h('div', { class: 'loot-hint' }, `${range(l, k)} | Ocupa da bolsa: ${l.bagPct}%`))))))),
        results));
    renderResults();
  }

  function renderResults() {
    if (!results) return;
    const data = App.data.heists.kortz;
    const r = GtaHeists.kortz(data, form);
    results.replaceChildren(
      h('div', { class: 'card pad' },
        head('bag', 'Plano das bolsas'),
        r.value
          ? h('div', { class: 'bag-plan' }, r.bags.map((b, i) => h('div', null,
            h('h4', null, h('span', null, form.crewSize === 1 ? 'Sua bolsa' : `Bolsa ${i + 1}`), h('span', { class: 'muted' }, `${pct(b.usedPct)} · ${money(b.value)}`)),
            b.items.length
              ? h('table', null, h('tbody', null, b.items.map(x => h('tr', null, h('td', null, `${x.count}x ${x.name}`), h('td', null, pct(x.bagPct)), h('td', null, money(x.value))))))
              : h('p', { class: 'muted small' }, 'Vazia.'))))
          : h('p', { class: 'muted' }, 'Nenhum secundário marcado.'),
        r.left.length ? h('p', { class: 'muted small' }, `Fica para trás: ${r.left.map(x => `${x.count}x ${x.name}`).join(', ')}.`) : null,
        r.skipped.length ? h('p', { class: 'warn' }, 'Itens da Crisp Gallery ignorados: a sala precisa de 2 jogadores para abrir.') : null),
      h('div', { class: 'card pad' },
        head('dollar', 'Secundários'),
        h('dl', { class: 'sums' },
          h('dt', { class: 'strong' }, 'Valor médio estimado'), h('dd', { class: 'strong' }, money(r.value))),
        h('p', { class: 'muted small' }, 'Cada item tem um valor sorteado dentro da faixa; o plano usa a média. Levar tiro com a bolsa cheia tira valor do que você carrega.'),
        h('p', { class: 'muted small' }, 'Buyer\'s Request: se os itens dourados do pedido do comprador estiverem no plano, pegue todos para ganhar o bônus.')));
  }

  window.Pages = window.Pages || {};
  window.Pages.kortz = {
    mount(el) {
      root = el;
      body = h('div', { class: 'tab-body' });
      const W = window.HeistWiki;
      const options = [...W.tabs('kortz'), { value: 'calc', label: 'Calculadora' }];
      tab = W.savedTab('kortz', tab, options.map(o => o.value));
      const show = () => { results = null; if (W.isWikiTab(tab)) W.mount(body, 'kortz', tab); else render(); };
      UI.fill(root,
        h('div', { class: 'page-head' },
          h('div', null,
            h('h1', null, 'The Kortz Center Heist'),
            h('div', { class: 'tabs' }, segmented(options, tab, v => { tab = v; W.saveTab('kortz', v); show(); })))),
        body);
      show();
    },
    onState(_s, force) {
      if (force && body && body.isConnected && window.HeistWiki.isWikiTab(tab)) window.HeistWiki.mount(body, 'kortz', tab);
    }
  };
})();
