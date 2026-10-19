(function () {
  'use strict';
  const { h, money, moneyShort, icon, bizIcon, ring, bar } = UI;
  const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const P = GtaProduction;
  const TONE_ORDER = { stopped: 0, ready: 1, warning: 2, ok: 3 };
  const PILL = { ok: 'blue', warning: 'warn', stopped: 'danger', ready: 'ok' };
  let root = null;
  let live = [];
  let signature = '';

  function snapshot() {
    const rows = App.owned().map(def => ({ def, ...App.business(def) }));
    rows.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.p.minutesToStop - b.p.minutesToStop);
    return rows;
  }

  const sig = rows => `${App.state.settings.paused}|${rows.map(r => `${r.def.id}:${r.tone}`).join()}`;
  const supplyColor = v => (v <= 15 ? 'var(--danger)' : v <= 35 ? 'var(--warn)' : 'var(--ok)');

  function tile(visual, title, sub) {
    return h('div', { class: 'card pad health-tile' }, visual, h('div', { class: 'grow' }, h('div', { class: 'tile-title' }, title), sub));
  }

  // Each live value registers a closure that refreshes it from a fresh snapshot every second.
  function liveText(cls, fn) {
    const el = h('div', { class: cls });
    live.push(rows => { el.textContent = fn(rows); });
    return el;
  }

  function render() {
    if (!root) return;
    live = [];
    const rows = snapshot();
    signature = sig(rows);
    const s = App.state;
    const stopped = rows.filter(r => r.tone === 'stopped');
    const warning = rows.filter(r => r.tone === 'warning');
    const ready = rows.filter(r => r.tone === 'ready');

    let banner = null;
    if (!rows.length) {
      banner = h('div', { class: 'banner info' }, icon('info', 20),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, 'Nenhum negócio marcado ainda'),
          h('div', { class: 'text' }, 'Marque os negócios que você tem e os upgrades de cada um. Os timers começam a contar com o GTA aberto.')),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary sm', onclick: () => App.navigate('businesses') }, 'Marcar negócios')));
    } else if (stopped.length) {
      banner = h('div', { class: 'banner danger' }, icon('alert', 20),
        h('div', { class: 'grow' },
          h('div', { class: 'title' }, stopped.length === 1 ? '1 negócio parado' : `${stopped.length} negócios parados`),
          h('div', { class: 'text' }, stopped.map(r => `${r.def.name}: ${r.text.replace(/^Parado: /, '')}`).join(' · '))),
        h('div', { class: 'actions' }, h('button', { class: 'btn secondary sm', onclick: () => App.navigate('businesses') }, 'Ver negócios')));
    } else if (ready.length) {
      banner = h('div', { class: 'banner ok' }, icon('dollar', 20),
        h('div', { class: 'grow' },
          h('div', { class: 'title' }, ready.length === 1 ? '1 negócio pronto para vender' : `${ready.length} negócios prontos para vender`),
          h('div', { class: 'text' }, `${ready.map(r => r.def.name).join(' · ')}: estoque cheio, a produção está parada até vender.`)),
        h('div', { class: 'actions' }, h('button', { class: 'btn secondary sm', onclick: () => App.navigate('businesses') }, 'Ver negócios')));
    } else if (warning.length) {
      banner = h('div', { class: 'banner warn' }, icon('clock', 20),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, 'Quase parando'),
          h('div', { class: 'text' }, warning.map(r => `${r.def.name}: ${r.text.toLowerCase()}`).join(' · '))));
    }

    const stockRing = ring(0, { label: 'em estoque', display: '', color: 'var(--accent)' });
    live.push(list => {
      const value = list.reduce((sum, r) => sum + r.p.stockValue, 0);
      const max = list.reduce((sum, r) => sum + r.def.capacity * r.p.rates.unitValue, 0);
      stockRing.set(max ? (value / max) * 100 : 0, compact.format(Math.round(value)));
    });
    const supplyRing = ring(0, { label: 'suprimento', color: 'var(--ok)' });
    live.push(list => {
      const low = list.slice().sort((a, b) => a.p.supplyPct - b.p.supplyPct)[0];
      supplyRing.set(low ? low.p.supplyPct : 0, low ? `${Math.round(low.p.supplyPct)}%` : '—', supplyColor(low ? low.p.supplyPct : 0));
    });

    UI.fill(root, 
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Visão geral'), h('div', { class: 'sub' }, 'Produção dos negócios e golpes num lugar só. O tempo só conta com você online.')),
        h('div', { class: 'actions' },
          h('button', { class: 'btn secondary', onclick: () => App.act(window.gta.setSettings({ paused: !s.settings.paused })) },
            icon(s.settings.paused ? 'play' : 'pause', 16), s.settings.paused ? 'Retomar timers' : 'Pausar timers'))),
      banner,
      h('div', { class: 'grid health-top' },
        tile(stockRing, 'Valor em estoque', liveText('tile-sub', list => {
          const max = list.reduce((sum, r) => sum + r.def.capacity * r.p.rates.unitValue, 0);
          return list.length ? `${money(list.reduce((sum, r) => sum + r.p.stockValue, 0))} de ${moneyShort(max)} possíveis` : 'Sem negócios marcados';
        })),
        tile(supplyRing, 'Suprimento mais baixo', liveText('tile-sub', list => {
          const low = list.slice().sort((a, b) => a.p.supplyPct - b.p.supplyPct)[0];
          return low ? low.def.name : 'Sem negócios marcados';
        })),
        tile(h('span', { class: 'tile-icon' }, icon('clock', 24)), 'Próximo a parar', liveText('tile-sub', list => {
          const next = list.filter(r => r.p.producing).sort((a, b) => a.p.minutesToStop - b.p.minutesToStop)[0];
          return next ? `${next.def.name} em ${P.formatMinutes(next.p.minutesToStop)} de jogo` : 'Nada produzindo agora';
        })),
        tile(h('span', { class: 'tile-icon cayo' }, icon('cayo', 24)), 'Cayo Perico', liveText('tile-sub', () => {
          const cd = App.state.cayoCooldownEndsAt;
          return cd && cd > Date.now() ? `Libera em ${P.formatMinutes((cd - Date.now()) / 60000)}` : 'Liberado pra fazer de novo';
        }))),
      h('div', { class: 'grid health-bottom' },
        h('div', { class: 'card pad' },
          h('div', { class: 'card-head' }, h('h3', null, icon('businesses', 18), 'Negócios'), h('span', { class: 'grow' }),
            h('button', { class: 'btn ghost sm', onclick: () => App.navigate('businesses') }, 'Gerenciar', icon('chevron', 15))),
          rows.length
            ? h('div', { class: 'rows' }, rows.map(row))
            : h('p', { class: 'muted' }, 'Nada por aqui ainda.')),
        h('div', { class: 'card pad' },
          h('div', { class: 'card-head' }, h('h3', null, icon('casino', 18), 'Golpes')),
          h('div', { class: 'rows' },
            heistRow('cayo', 'Cayo Perico', () => {
              const cd = App.state.cayoCooldownEndsAt;
              return cd && cd > Date.now() ? `Cooldown: libera em ${P.formatMinutes((cd - Date.now()) / 60000)}` : 'Mapa do scout e plano das bolsas';
            }),
            heistRow('casino', 'Diamond Casino', () => 'Calculadora de corte e taxas'),
            heistRow('payouts', 'Tabela de payouts', () => 'Valores atuais e bônus semanal')))));
    tickLive(rows);
  }

  function row(r) {
    const meta = h('div', { class: 'meta' }, r.text);
    const supply = bar(r.p.supplyPct, supplyColor(r.p.supplyPct), 'thin');
    const stock = h('span', { class: 'size' }, money(r.p.stockValue));
    live.push(list => {
      const now = list.find(x => x.def.id === r.def.id);
      if (!now) return;
      meta.textContent = now.text;
      supply.firstChild.style.width = `${now.p.supplyPct}%`;
      supply.firstChild.style.background = supplyColor(now.p.supplyPct);
      stock.textContent = money(now.p.stockValue);
    });
    return h('button', { class: 'row-item link', onclick: () => App.navigate('businesses') },
      bizIcon(r.def.id),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, r.def.name), meta),
      h('div', { class: 'mini-bar', title: 'Suprimentos' }, supply),
      stock,
      h('span', { class: `pill sm ${PILL[r.tone]}` }, r.pill));
  }

  function heistRow(page, title, metaFn) {
    const meta = h('div', { class: 'meta' }, metaFn());
    live.push(() => { meta.textContent = metaFn(); });
    return h('button', { class: 'row-item link', onclick: () => App.navigate(page) },
      h('span', { class: 'cat-icon heist' }, icon(page, 18)),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, title), meta),
      icon('chevron', 16));
  }

  function tickLive(rows) {
    for (const fn of live) fn(rows);
  }

  function onSecond() {
    const rows = snapshot();
    if (sig(rows) !== signature) render();
    else tickLive(rows);
  }

  window.Pages = window.Pages || {};
  window.Pages.overview = {
    mount(el) { root = el; render(); },
    onState(_s, force) { if (root && root.isConnected) { if (force) render(); else onSecond(); } },
    onSecond() { if (root && root.isConnected) onSecond(); }
  };
})();
