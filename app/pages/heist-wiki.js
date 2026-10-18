// Heist wiki tabs (Visão geral, Setups, Final) shared by every heist page. Content comes from
// data/wiki.json (refreshed from GitHub by wiki-feed.cjs); the setups the player already did are
// kept in state.heistProgress.
(function () {
  'use strict';
  const { h, icon } = UI;
  const KINDS = { scope: 'Reconhecimento', prep: 'Preparação', setup: 'Setup', optional: 'Opcional' };
  const opened = new Map(); // heist id -> setup id open in the Setups tab
  const filters = new Map(); // heist id -> approach id shown in the Setups tab

  const chosen = (id, x) => filters.get(id) || (x.approaches && x.approaches.length ? x.approaches[0].id : null);
  const heist = id => App.data.wiki && App.data.wiki.heists[id];
  const done = id => new Set((App.state.heistProgress || {})[id] || []);

  function source(url, label) {
    return h('button', { class: 'btn ghost sm wiki-source', type: 'button', title: url, onclick: () => window.gta.openSource(url) },
      icon('download', 14), label || 'Ver no GTA Wiki');
  }

  function footer(x) {
    return h('p', { class: 'muted small wiki-foot' },
      'Resumo próprio com base no GTA Wiki (Fandom, CC BY-SA). ',
      x.review ? 'Algumas partes ainda estão sendo conferidas no jogo. ' : '',
      source(x.source));
  }

  function list(items, ordered) {
    return h(ordered ? 'ol' : 'ul', { class: 'wiki-list' }, items.map(t => h('li', null, t)));
  }

  function overview(x) {
    return h('div', { class: 'wiki' },
      h('div', { class: 'wiki-facts' }, x.facts.map(f => h('div', { class: 'card pad wiki-fact' },
        h('span', null, f.label), h('b', null, f.value)))),
      h('div', { class: 'card pad wiki-text' }, x.overview.map(p => h('p', null, p))),
      x.start && x.start.length ? h('div', { class: 'card pad' },
        h('div', { class: 'card-head' }, h('h3', null, 'Como começar')), list(x.start)) : null,
      x.approaches && x.approaches.length ? h('div', { class: 'card pad' },
        h('div', { class: 'card-head' }, h('h3', null, 'Approaches')),
        h('div', { class: 'wiki-approaches' }, x.approaches.map(a => h('div', { class: 'wiki-approach' },
          h('b', null, a.name), h('p', null, a.summary))))) : null,
      footer(x));
  }

  function setupsTab(id, x, rerender) {
    const open = opened.get(id);
    const step = open && x.setups.find(s => s.id === open);
    if (step) return setupPage(id, x, step, rerender);
    const ok = done(id);
    const approach = chosen(id, x);
    const shown = x.setups.filter(s => !approach || !s.approaches || s.approaches.includes(approach));
    const count = shown.filter(s => ok.has(s.id)).length;
    return h('div', { class: 'wiki' },
      h('div', { class: 'card pad' },
        h('div', { class: 'card-head' },
          h('div', { class: 'grow' }, h('h3', null, 'Setups'), h('div', { class: 'meta' }, `${count} de ${shown.length} feitos`)),
          count ? h('button', { class: 'btn ghost sm', type: 'button', title: 'Comecei um golpe novo', onclick: () => App.act(window.gta.heistReset(id)) }, icon('x', 14), 'Zerar') : null),
        UI.bar(shown.length ? (count / shown.length) * 100 : 0, 'var(--accent)', 'thin'),
        x.approaches && x.approaches.length
          ? h('div', { class: 'wiki-filter' }, UI.segmented(x.approaches.map(a => ({ value: a.id, label: a.name })), approach,
            v => { filters.set(id, v); rerender(); }))
          : null,
        h('div', { class: 'rows wiki-steps' }, shown.map((s, i) => {
          const isDone = ok.has(s.id);
          return h('div', { class: `row-item link wiki-step ${isDone ? 'done' : ''}`, role: 'button', tabindex: '0',
            onclick: () => { opened.set(id, s.id); rerender(); } },
          h('button', { class: `wiki-check ${isDone ? 'on' : ''}`, type: 'button', title: isDone ? 'Desmarcar' : 'Marcar como feito',
            onclick: e => { e.stopPropagation(); App.act(window.gta.heistStep(id, s.id, !isDone)); } }, isDone ? icon('check', 16) : String(i + 1)),
          h('div', { class: 'grow' },
            h('div', { class: 'title' }, s.name),
            h('div', { class: 'meta' }, s.goal)),
          s.group ? h('span', { class: 'pill sm warn' }, s.group) : null,
          h('span', { class: `pill sm ${s.kind === 'optional' ? '' : 'info'}` }, KINDS[s.kind] || s.kind),
          icon('chevron', 16));
        }))),
      footer(x));
  }

  function setupPage(id, x, s, rerender) {
    const isDone = done(id).has(s.id);
    const approach = chosen(id, x);
    const shown = x.setups.filter(t => !approach || !t.approaches || t.approaches.includes(approach));
    const index = shown.indexOf(s);
    const go = d => { const next = shown[index + d]; if (next) { opened.set(id, next.id); rerender(); } };
    return h('div', { class: 'wiki' },
      h('div', { class: 'wiki-nav' },
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { opened.delete(id); rerender(); } }, h('span', { class: 'flip' }, icon('chevron', 15)), 'Todos os setups'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn ghost icon sm', type: 'button', title: 'Anterior', disabled: index <= 0, onclick: () => go(-1) }, h('span', { class: 'flip' }, icon('chevron', 15))),
        h('button', { class: 'btn ghost icon sm', type: 'button', title: 'Próximo', disabled: index === shown.length - 1, onclick: () => go(1) }, icon('chevron', 15))),
      h('div', { class: 'card pad' },
        h('div', { class: 'card-head' },
          h('div', { class: 'grow' },
            h('h3', { class: 'wiki-title' }, s.name),
            h('div', { class: 'biz-pills' },
              h('span', { class: 'pill sm info' }, KINDS[s.kind] || s.kind),
              s.group ? h('span', { class: 'pill sm warn' }, s.group) : null,
              s.players ? h('span', { class: 'pill sm' }, s.players) : null,
              (s.approaches || []).map(a => h('span', { class: 'pill sm' }, (x.approaches.find(p => p.id === a) || {}).name || a)))),
          h('button', { class: `btn ${isDone ? 'secondary' : 'primary'} sm`, type: 'button', onclick: () => App.act(window.gta.heistStep(id, s.id, !isDone)) },
            icon('check', 15), isDone ? 'Feito' : 'Marcar como feito')),
        h('p', { class: 'wiki-goal' }, s.goal),
        h('h4', null, 'Passo a passo'), list(s.steps, true),
        s.tips.length ? [h('h4', null, 'Dicas'), list(s.tips)] : null,
        s.source ? h('div', { class: 'wiki-actions' }, source(s.source)) : null),
      footer(x));
  }

  function finale(id, x, rerender) {
    const f = x.finale;
    const approach = chosen(id, x);
    const v = f.variants && f.variants.find(p => p.approach === approach);
    const steps = (title, items, ordered) => (items && items.length ? [h('h4', null, title), list(items, ordered)] : null);
    return h('div', { class: 'wiki' },
      h('div', { class: 'card pad wiki-text' },
        h('div', { class: 'card-head' }, h('h3', null, f.name || 'Final')),
        h('p', null, f.summary),
        f.roles && f.roles.length ? [h('h4', null, 'Papéis'), h('div', { class: 'wiki-approaches' }, f.roles.map(r => h('div', { class: 'wiki-approach' }, h('b', null, r.name), h('p', null, r.text))))] : null,
        steps('Passo a passo', f.steps, true),
        steps('Dicas', f.tips),
        f.source ? h('div', { class: 'wiki-actions' }, source(f.source)) : null),
      f.variants && f.variants.length ? h('div', { class: 'card pad wiki-text' },
        h('div', { class: 'card-head' }, h('h3', null, 'Por approach')),
        h('div', { class: 'wiki-filter' }, UI.segmented(x.approaches.map(a => ({ value: a.id, label: a.name })), approach,
          a => { filters.set(id, a); rerender(); })),
        v ? [
          h('h4', null, v.name),
          h('p', null, v.summary),
          steps('Passo a passo', v.steps, true),
          steps('Dicas', v.tips),
          v.source ? h('div', { class: 'wiki-actions' }, source(v.source)) : null] : null) : null,
      footer(x));
  }

  // Renders one wiki tab into `body`; returns false when this heist has no wiki yet.
  function mount(body, id, tab) {
    const x = heist(id);
    if (!x) return false;
    const rerender = () => mount(body, id, tab);
    const scroll = document.getElementById('main');
    const top = scroll ? scroll.scrollTop : 0;
    UI.fill(body, tab === 'overview' ? overview(x) : tab === 'setups' ? setupsTab(id, x, rerender) : finale(id, x, rerender));
    if (scroll && tab === 'setups' && !opened.get(id)) scroll.scrollTop = top;
    return true;
  }

  const TABS = [{ value: 'overview', label: 'Visão geral' }, { value: 'setups', label: 'Setups' }, { value: 'finale', label: 'Final' }];
  const tabs = id => (heist(id) ? TABS : []);
  const isWikiTab = tab => TABS.some(t => t.value === tab);

  // Last tab per page, so going back to a heist opens where the player left it.
  function savedTab(page, fallback, allowed) {
    try {
      const v = localStorage.getItem(`gta-helper.tab.${page}`);
      if (allowed.includes(v)) return v;
    } catch { /* conveniência apenas */ }
    return fallback;
  }
  function saveTab(page, tab) {
    try { localStorage.setItem(`gta-helper.tab.${page}`, tab); } catch { /* conveniência apenas */ }
  }

  window.HeistWiki = { mount, tabs, isWikiTab, savedTab, saveTab };
})();
