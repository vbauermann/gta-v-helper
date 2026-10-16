// "Semana" page: this week's GTA Online bonuses, discounts and rotating vehicles, from
// data/weekly.json. The week turns every Thursday; the header counts down to the next reset.
(function () {
  'use strict';
  const { h, money, icon } = UI;
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const resetFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  let root = null;
  let countdown = null;

  const head = (iconName, title, ...extra) => h('div', { class: 'card-head' }, h('h3', null, icon(iconName, 18), title), ...extra);
  const date = s => new Date(`${s}T12:00:00Z`);

  function range(w) {
    const a = date(w.start), b = date(w.end);
    const [da, ma] = dayMonth.format(a).split(' de ');
    return ma === dayMonth.format(b).split(' de ')[1] ? `${da} a ${dayMonth.format(b)}` : `${dayMonth.format(a)} a ${dayMonth.format(b)}`;
  }

  function left(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return d ? `${d}d ${hh}h` : hh ? `${hh}h ${mm}min` : `${mm}min`;
  }

  // Things the player owns or plays show a "pra você" tag.
  function mineMatcher() {
    const words = App.owned().map(d => d.name.toLowerCase());
    words.push('cayo perico heist', 'diamond casino heist', 'golpe do cayo', 'golpe do cassino');
    return name => words.some(w => name.toLowerCase().includes(w));
  }

  function item(it, mine, extra) {
    return h('div', { class: `wk-item${mine(it.name) ? ' mine' : ''}` },
      h('div', { class: 'grow' },
        h('div', { class: 'wk-name' }, it.name, mine(it.name) ? h('span', { class: 'pill sm ok' }, 'pra você') : null),
        it.note ? h('div', { class: 'wk-note' }, it.note) : null),
      extra || null);
  }

  function price(it) {
    if (it.sale) return h('div', { class: 'wk-price' }, h('s', null, money(it.price)), h('b', null, money(it.sale)));
    if (it.price) return h('div', { class: 'wk-price' }, h('b', null, money(it.price)));
    return null;
  }

  function tile(iconName, cls, title, sub) {
    return h('div', { class: 'card pad health-tile wk-tile' },
      h('span', { class: `tile-icon ${cls}` }, icon(iconName, 24)),
      h('div', { class: 'grow' }, h('div', { class: 'tile-sub' }, title), h('div', { class: 'tile-title' }, sub)));
  }

  function render() {
    const w = App.data.weekly;
    const mine = mineMatcher();
    const reset = new Date(w.resetUtc);
    const old = Date.now() >= reset.getTime();
    const top = w.bonuses[0];
    const bestCut = w.discounts[0];
    countdown = h('span', { class: 'pill info wk-reset' });
    UI.fill(root,
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Semana no GTA Online'),
          h('div', { class: 'sub' }, `${range(w)}${w.theme ? ` · ${w.theme}` : ''}. A semana vira toda quinta, ${resetFmt.format(reset).replace(',', '')} no seu horário.`)),
        countdown),
      old ? h('div', { class: 'banner warn' }, icon('alert', 20), h('div', { class: 'grow' },
        h('div', { class: 'title' }, 'Já começou outra semana'),
        h('div', { class: 'text' }, 'Estes bônus são da semana passada. A lista nova chega com a próxima versão do app.'))) : null,
      h('div', { class: 'grid wk-top' },
        tile('star', '', `Maior bônus · ${top.mult}`, top.items.map(i => i.name).join(', ')),
        tile('casino', 'podium', 'Carro do pódio', w.vehicles.podium.name),
        tile('flag', 'prize', 'Prize ride', w.vehicles.prize.name),
        tile('tag', 'sale', `Maior desconto · ${bestCut.pct}%`, bestCut.items.slice(0, 2).map(i => i.name).join(', ') + (bestCut.items.length > 2 ? ` e mais ${bestCut.items.length - 2}` : ''))),
      h('div', { class: 'grid wk-cols' },
        h('div', { class: 'left-col' },
          h('div', { class: 'card pad' },
            head('star', 'Bônus em GTA$ e RP'),
            w.bonuses.map(g => h('div', { class: 'wk-group' },
              h('span', { class: `wk-mult m${g.mult.replace(/\D/g, '')}` }, g.mult),
              h('div', { class: 'wk-list' }, g.items.map(it => item(it, mine)))))),
          h('div', { class: 'card pad' },
            head('dollar', 'Recompensas e desafios'),
            h('div', { class: 'wk-list' }, w.rewards.map(it => item(it, mine)))),
          h('div', { class: 'card pad' },
            head('clock', 'Rotação da semana'),
            h('dl', { class: 'wk-rot' }, w.rotations.map(r => [h('dt', null, r.label), h('dd', null, r.value)])))),
        h('div', { class: 'left-col' },
          h('div', { class: 'card pad' },
            head('tag', 'Descontos'),
            w.discounts.map(g => h('div', { class: 'wk-group' },
              h('span', { class: 'wk-mult sale' }, `${g.pct}%`),
              h('div', { class: 'wk-list' }, g.items.map(it => item(it, mine, price(it))))))),
          h('div', { class: 'card pad' },
            head('flag', 'Veículos'),
            h('div', { class: 'wk-list' },
              item({ name: w.vehicles.podium.name, note: `Pódio · ${w.vehicles.podium.note}` }, mine, price(w.vehicles.podium)),
              item({ name: w.vehicles.prize.name, note: `Prize ride · ${w.vehicles.prize.note}` }, mine),
              w.vehicles.testRides.map(it => item(it, mine, price(it))),
              w.vehicles.showroom.map(it => item(it, mine, price(it))))),
          h('div', { class: 'card pad' },
            head('box', 'Gun Van'),
            h('div', { class: 'wk-list' }, w.gunVan.map(it => item(it, mine)))),
          w.gtaPlus ? h('details', { class: 'card pad wk-plus' },
            h('summary', null, icon('chevron', 15), `GTA+ (até ${dayMonth.format(date(w.gtaPlus.until))})`),
            h('ul', null, w.gtaPlus.items.map(t => h('li', null, t)))) : null)),
      h('p', { class: 'muted small foot-note' }, `Fontes: ${w.sources.map(s => s.name).join(', ')}.`));
    onSecond();
  }

  function onSecond() {
    if (!countdown) return;
    const ms = new Date(App.data.weekly.resetUtc).getTime() - Date.now();
    countdown.textContent = ms > 0 ? `Nova semana em ${left(ms)}` : 'Semana nova já começou';
  }

  window.Pages = window.Pages || {};
  window.Pages.weekly = {
    mount(el) { root = el; render(); },
    onSecond() { if (root && root.isConnected) onSecond(); }
  };
})();
