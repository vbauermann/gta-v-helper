// Fleeca Job page: only the wiki tabs for now (the payout sits in Tabela de payouts).
(function () {
  'use strict';
  const { h, segmented } = UI;
  let body = null;
  let tab = 'overview';

  window.Pages = window.Pages || {};
  window.Pages.fleeca = {
    mount(el) {
      const W = window.HeistWiki;
      body = h('div', { class: 'tab-body' });
      const options = W.tabs('fleeca');
      tab = W.savedTab('fleeca', tab, options.map(o => o.value));
      UI.fill(el,
        h('div', { class: 'page-head' },
          h('div', null,
            h('h1', null, 'Fleeca Job'),
            h('div', { class: 'tabs' }, segmented(options, tab, v => { tab = v; W.saveTab('fleeca', v); W.mount(body, 'fleeca', tab); })))),
        body);
      W.mount(body, 'fleeca', tab);
    },
    onState(_s, force) { if (force && body && body.isConnected) window.HeistWiki.mount(body, 'fleeca', tab); }
  };
})();
