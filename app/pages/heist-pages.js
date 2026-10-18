// Heists that only have the wiki tabs (Visão geral, Setups, Final). Each one is a sidebar item in
// Golpes; the content comes from data/wiki.json. Cayo and Casino have their own pages with extra tabs.
(function () {
  'use strict';
  const { h, segmented } = UI;
  const HEISTS = {
    kortz: 'The Kortz Center Heist',
    doomsday: 'The Doomsday Heist',
    pacific: 'The Pacific Standard Job',
    seriesa: 'Series A Funding',
    humane: 'The Humane Labs Raid',
    prison: 'The Prison Break',
    fleeca: 'Fleeca Job'
  };

  function page(id, title) {
    let body = null;
    let tab = 'overview';
    return {
      mount(el) {
        const W = window.HeistWiki;
        body = h('div', { class: 'tab-body' });
        const options = W.tabs(id);
        if (!options.length) {
          UI.fill(el, h('div', { class: 'page-head' }, h('h1', null, title)),
            h('div', { class: 'card' }, h('div', { class: 'empty' }, h('p', null, 'A wiki deste golpe ainda não chegou. Ela é baixada automaticamente quando o app estiver online.'))));
          return;
        }
        tab = W.savedTab(id, tab, options.map(o => o.value));
        UI.fill(el,
          h('div', { class: 'page-head' },
            h('div', null,
              h('h1', null, title),
              h('div', { class: 'tabs' }, segmented(options, tab, v => { tab = v; W.saveTab(id, v); W.mount(body, id, tab); })))),
          body);
        W.mount(body, id, tab);
      },
      onState(_s, force) { if (force && body && body.isConnected) window.HeistWiki.mount(body, id, tab); }
    };
  }

  window.Pages = window.Pages || {};
  for (const [id, title] of Object.entries(HEISTS)) window.Pages[id] = page(id, title);
  window.HeistPages = Object.keys(HEISTS);
})();
