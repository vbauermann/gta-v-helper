(function () {
  'use strict';
  const { h, money } = UI;
  const cell = v => (typeof v === 'number' ? money(v) : v == null ? '—' : String(v).match(/^\d/) ? `GTA$ ${v}` : v);

  window.Pages = window.Pages || {};
  window.Pages.payouts = {
    mount(root) {
      const { payoutTable, sources, version } = App.data.heists;
      root.replaceChildren(
        h('div', { class: 'page-head' },
          h('h1', null, 'Tabela de payouts'),
          h('p', { class: 'muted' }, `Atualização de economia. Fontes: ${sources.join('; ')}. Dados de ${version}.`)),
        h('div', { class: 'card' }, h('table', { class: 'payouts' },
          h('thead', null, h('tr', null, ['Golpe', 'Antes', 'Base atual', 'Multiplicador semanal', '1ª conclusão da semana'].map(t => h('th', null, t)))),
          h('tbody', null, payoutTable.map(row => h('tr', null,
            h('td', null, row.name), h('td', { class: 'muted' }, cell(row.previous)), h('td', { class: 'strong' }, cell(row.base)),
            h('td', null, row.weeklyMultiplier), h('td', null, cell(row.firstWeekly))))))),
        h('p', { class: 'muted' }, 'Cayo Perico não tem multiplicador de primeira conclusão.'));
    }
  };
})();
