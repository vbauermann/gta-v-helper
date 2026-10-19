// Negócios page: the Nightclub (technicians make goods from the linked businesses), the CEO special
// cargo warehouses (crates bought in missions) and the Import/Export vehicle warehouse. Warehouses
// are places on the Los Santos map; marking one here or on the map is the same thing.
(function () {
  'use strict';
  const { h, money, moneyShort, number, numberInput, icon, bizIcon, bar, select } = UI;
  const P = GtaProduction;
  const NC = GtaNightclub;
  const PILL = { ok: 'blue', warning: 'warn', stopped: 'danger', ready: 'ok' };

  const cfg = () => App.data.catalog.nightclub;
  const points = cat => App.data.lsMap.points.filter(p => p.category === cat);
  const point = id => App.data.lsMap.points.find(p => p.id === id);
  const hasPoints = cat => points(cat).length > 0;
  const SIZE = { small: 'Pequena', medium: 'Média', large: 'Grande' };
  const cratesCap = p => App.data.catalog.cargo.sizes[(p && p.size) || 'large'];

  // ---------- status (shared with the sidebar badge) ----------
  function nightclub() {
    const s = App.state;
    const p = NC.project(cfg(), s, s.nightclub.activeMinutes + (s.nightclub.owned ? App.extraMinutes() : 0));
    let tone = 'ok', pill = 'Produzindo', text;
    if (!p.technicians) { tone = 'warning'; pill = 'Sem técnicos'; text = 'Nenhum negócio vinculado. Ligue o botão do Nightclub nos negócios.'; }
    else if (p.full) { tone = 'ready'; pill = 'Pronto para vender'; text = 'Depósito cheio, os técnicos pararam. Hora de vender.'; }
    else text = `${p.technicians} ${p.technicians === 1 ? 'técnico' : 'técnicos'} · tudo cheio em ${P.formatMinutes(p.minutesToFull)}`;
    return { p, tone, pill, text };
  }

  function cargo() {
    const list = App.state.warehouses.cargo.map(w => {
      const pt = point(w.point);
      const cap = cratesCap(pt);
      return { ...w, pt, cap, full: w.crates >= cap, value: NC.cargoValue(App.data.catalog.cargo.sale, w.crates) };
    });
    const crates = list.reduce((a, w) => a + w.crates, 0);
    const cap = list.reduce((a, w) => a + w.cap, 0);
    const value = list.reduce((a, w) => a + w.value, 0);
    const ready = list.some(w => w.full);
    return { list, crates, cap, value, tone: ready ? 'ready' : 'ok', pill: ready ? 'Pronto para vender' : `${crates} caixas` };
  }

  function vehicles() {
    const v = App.state.warehouses.vehicle;
    const cap = App.data.catalog.vehicles.capacity;
    const full = v.cars >= cap;
    return { ...v, pt: v.point ? point(v.point) : null, cap, tone: full ? 'ready' : 'ok', pill: full ? 'Cheia' : `${v.cars} carros` };
  }

  // How many of these need a look (sidebar badge on Negócios).
  function attention() {
    const s = App.state;
    let n = 0;
    if (s.nightclub.owned && nightclub().tone !== 'ok') n++;
    if (s.warehouses.cargo.length && cargo().tone !== 'ok') n++;
    return n;
  }

  // ---------- shared bits ----------
  function meter(label, live, value, color, text) {
    const b = bar(value, color, 'thin');
    b.firstChild.dataset.live = live;
    return h('div', { class: 'meter' },
      h('span', { class: 'meter-label' }, label), b,
      h('b', { class: 'num meter-text', dataset: { live: `${live}-text` } }, text));
  }

  let rerender = () => {};
  const expanded = new Set();
  const adjusting = new Set();
  const toggle = (set, id) => { if (set.has(id)) set.delete(id); else set.add(id); rerender(); };
  const stop = e => e.stopPropagation();

  function shell(id, tone, head, body) {
    return h('article', { class: `card biz biz-${id} ${tone} ${expanded.has(id) ? 'open' : ''}`, dataset: { extra: id } }, head, body);
  }

  function row(id, name, meta, pills, meters, quick) {
    const open = expanded.has(id);
    return h('div', { class: 'biz-row', title: open ? 'Recolher' : 'Ver detalhes', onclick: () => toggle(expanded, id) },
      bizIcon(id, 36),
      h('div', { class: 'biz-name' }, h('h3', null, name), h('div', { class: 'meta' }, meta), h('div', { class: 'biz-pills' }, pills)),
      h('div', { class: 'biz-meters' }, meters),
      h('div', { class: 'biz-quick', onclick: stop }, quick,
        h('button', { class: `btn ghost icon sm biz-toggle ${open ? 'open' : ''}`, title: open ? 'Recolher' : 'Ver detalhes', 'aria-expanded': String(open), onclick: () => toggle(expanded, id) }, icon('chevron', 16))));
  }

  // ---------- Nightclub ----------
  function goodRow(g, def) {
    const s = App.state;
    let tech;
    if (def.source === 'cargo') {
      const can = NC.cargoSource(s);
      tech = { on: s.nightclub.cargo, can, why: 'Marque uma warehouse de cargo (CEO) ou um Hangar no mapa para vincular', act: on => window.gta.nightclub('cargo', on) };
    } else {
      const biz = s.businesses[def.source];
      const bdef = App.data.catalog.businesses.find(b => b.id === def.source);
      tech = { on: biz.owned && biz.nightclub, can: biz.owned, why: `Você não marcou ${bdef.name} nos Negócios`, act: on => window.gta.setNightclub(def.source, on) };
    }
    const source = def.source === 'cargo' ? 'Special Cargo (CEO) ou Hangar' : App.data.catalog.businesses.find(b => b.id === def.source).name;
    const state = !g.active ? 'sem técnico' : g.minutesToFull > 0 ? `cheio em ${P.formatMinutes(g.minutesToFull)}` : 'cheio';
    return h('div', { class: `nc-good${g.active ? '' : ' idle'}`, dataset: { good: g.id } },
      h('button', {
        class: `btn icon sm nightclub-toggle ${tech.on ? 'on' : 'ghost'}`, disabled: !tech.can && !tech.on,
        title: !tech.can && !tech.on ? tech.why : tech.on ? 'Técnico trabalhando aqui. Clique para tirar' : 'Colocar um técnico aqui',
        onclick: () => App.act(tech.act(!tech.on))
      }, icon('music', 14)),
      h('div', { class: 'nc-good-name' }, h('b', null, def.name), h('span', { class: 'meta' }, source)),
      bar((g.stock / g.cap) * 100, 'var(--biz-c)', 'thin'),
      h('span', { class: 'num nc-units', dataset: { live: 'units' } }, `${Math.floor(g.stock + 1e-9)}/${g.cap}`),
      h('span', { class: 'num nc-value', dataset: { live: 'gvalue' } }, money(g.value)),
      h('span', { class: 'muted small nc-state', dataset: { live: 'gstate' } }, state));
  }

  function nightclubCard() {
    const s = App.state;
    const nc = s.nightclub;
    const { p, tone, pill, text } = nightclub();
    const max = App.data.catalog.nightclubTechnicians || 5;
    const place = s.map.owned.map(point).find(x => x && x.category === 'nightclub');
    const head = row('nightclub', 'Nightclub', place ? `After Hours · ${place.name}` : 'After Hours',
      [h('span', { class: `pill sm ${PILL[tone]}`, dataset: { live: 'pill' } }, pill)],
      [meter('Estoque', 'nc-stock', (p.value / p.maxValue) * 100, 'var(--biz-c)', `${moneyShort(p.value)} / ${moneyShort(p.maxValue).replace('GTA$ ', '')}`),
        meter('Técnicos', 'nc-tech', (p.technicians / max) * 100, 'var(--info)', `${p.technicians}/${max}`)],
      [h('span', { class: 'nightclub-spacer' }),
        h('button', { class: 'btn secondary icon sm', title: 'Vendi tudo', 'aria-label': 'Vendi tudo', onclick: () => App.act(window.gta.nightclub('sell')) }, icon('dollar', 15)),
        h('span', { class: 'nightclub-spacer' })]);
    if (!expanded.has('nightclub')) return shell('nightclub', tone, head, null);
    const defs = cfg().goods;
    const body = h('div', { class: 'biz-more' },
      h('div', { class: 'biz-facts' },
        h('div', { class: 'stat-line' }, h('span', null, 'Valor do estoque'), h('b', { class: 'num', dataset: { live: 'value' } }, money(p.value))),
        h('div', { class: 'biz-status', dataset: { live: 'status' } }, text)),
      h('div', { class: 'nc-goods' }, p.goods.map((g, i) => goodRow(g, defs[i]))),
      h('div', { class: 'upgrades' },
        h('span', { class: 'upgrades-label' }, 'Andares do depósito'),
        [1, 2, 3, 4, 5].map(n => h('button', { class: `chip ${nc.floors === n ? 'on' : ''}`, type: 'button', title: n === 1 ? 'Só o andar que vem com o Nightclub' : `${n} andares: mais espaço para cada mercadoria`, onclick: () => App.act(window.gta.nightclub('floors', n)) }, String(n))),
        h('span', { class: 'upgrades-label nc-gap' }, 'Upgrades'),
        h('button', { class: `chip ${nc.equipment ? 'on' : ''}`, type: 'button', title: 'O upgrade de equipamento dobra a velocidade dos técnicos', onclick: () => App.act(window.gta.nightclub('equipment', !nc.equipment)) }, 'Equipamento')),
      h('div', { class: 'biz-tools' },
        h('button', { class: `btn ${adjusting.has('nightclub') ? 'secondary' : 'ghost'} sm`, onclick: () => toggle(adjusting, 'nightclub') }, icon('edit', 15), 'Informar estoque'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn danger sm', onclick: () => App.act(window.gta.nightclub('own', false)) }, 'Não tenho mais')),
      adjusting.has('nightclub') ? nightclubReport(p) : null);
    return shell('nightclub', tone, head, body);
  }

  function nightclubReport(p) {
    const inputs = p.goods.map(g => numberInput(Math.floor(g.stock + 1e-9), { min: 0, max: g.cap, step: 1, class: 'small' }));
    const save = async () => {
      for (const [i, g] of p.goods.entries()) {
        const units = Number(inputs[i].value);
        if (Number.isFinite(units) && units !== Math.floor(g.stock + 1e-9)) await window.gta.nightclub('stock', { id: g.id, units });
      }
      adjusting.delete('nightclub');
      App.act(window.gta.state());
    };
    return h('div', { class: 'report-box' },
      h('div', { class: 'report-title' }, 'Unidades de cada mercadoria no jogo (computador do escritório do Nightclub)'),
      h('div', { class: 'nc-report' }, p.goods.map((g, i) => h('label', { class: 'field' }, h('span', null, g.name), inputs[i], h('small', null, `máx. ${g.cap}`)))),
      h('div', { class: 'report-actions' },
        h('button', { class: 'btn primary sm', onclick: save }, 'Salvar'),
        h('button', { class: 'btn ghost sm', onclick: () => toggle(adjusting, 'nightclub') }, 'Cancelar')));
  }

  // ---------- Special cargo (CEO) ----------
  function warehouseRow(w) {
    const set = crates => App.act(window.gta.warehouse('crates', { point: w.point, crates: Math.max(0, Math.min(w.cap, crates)) }));
    const input = numberInput(w.crates, { min: 0, max: w.cap, step: 1, class: 'small', title: 'Caixas agora', onchange: e => set(Number(e.target.value) || 0) });
    return h('div', { class: `wh-row${w.full ? ' full' : ''}` },
      h('div', { class: 'nc-good-name' }, h('b', null, w.pt ? w.pt.name : w.point), h('span', { class: 'meta' }, `${SIZE[w.pt && w.pt.size] || ''} · ${w.cap} caixas`)),
      bar((w.crates / w.cap) * 100, w.full ? 'var(--ok)' : 'var(--biz-c)', 'thin'),
      input,
      h('span', { class: 'num nc-value' }, money(w.value)),
      h('div', { class: 'wh-actions' },
        [1, 2, 3].map(n => h('button', { class: 'btn ghost sm', type: 'button', title: `Comprei ${n} ${n === 1 ? 'caixa' : 'caixas'}`, disabled: w.full, onclick: () => set(w.crates + n) }, `+${n}`)),
        h('button', { class: 'btn secondary icon sm', type: 'button', title: 'Vendi as caixas', disabled: !w.crates, onclick: () => set(0) }, icon('dollar', 14)),
        h('button', { class: 'btn ghost icon sm', type: 'button', title: 'Não tenho mais esta warehouse', onclick: () => App.act(window.gta.mapOwn(w.point, false)) }, icon('x', 14))));
  }

  function addWarehouse(cat, label, max, ownedIds) {
    const free = points(cat).filter(p => !ownedIds.includes(p.id));
    if (!free.length || ownedIds.length >= max) return null;
    const pick = select(free.map(p => ({ value: p.id, label: p.size ? `${p.name} (${SIZE[p.size]}, ${cratesCap(p)} caixas)` : p.name })), free[0].id, { class: 'small wh-pick' });
    return h('div', { class: 'wh-add', onclick: stop }, pick,
      h('button', { class: 'btn secondary sm', type: 'button', onclick: () => App.act(window.gta.mapOwn(pick.value, true)) }, icon('plus', 15), label));
  }

  function cargoCard() {
    const c = cargo();
    const ncOn = App.state.nightclub.cargo;
    const max = App.data.catalog.cargo.max;
    const head = row('cargo', 'Special Cargo (CEO)', `${c.list.length} de ${max} warehouses`,
      [h('span', { class: `pill sm ${PILL[c.tone]}` }, c.pill)],
      [meter('Caixas', 'cargo', c.cap ? (c.crates / c.cap) * 100 : 0, 'var(--biz-c)', `${c.crates}/${c.cap}`),
        meter('Valor', 'cargo-value', c.cap ? (c.value / NC.cargoValue(App.data.catalog.cargo.sale, c.cap)) * 100 : 0, 'var(--ok)', moneyShort(c.value))],
      [h('span', { class: 'nightclub-spacer' }), h('span', { class: 'nightclub-spacer' }),
        h('button', {
          class: `btn icon sm nightclub-toggle ${ncOn ? 'on' : 'ghost'}`, 'aria-pressed': String(ncOn),
          title: ncOn ? 'Vinculado ao Nightclub (Cargo and Shipments). Clique para desvincular' : 'Vincular ao Nightclub (Cargo and Shipments)',
          onclick: () => App.act(window.gta.nightclub('cargo', !ncOn))
        }, icon('music', 15))]);
    if (!expanded.has('cargo')) return shell('cargo', c.tone, head, null);
    const body = h('div', { class: 'biz-more' },
      h('p', { class: 'muted small wh-note' }, 'As caixas vêm das missões de compra no escritório. Marque aqui quantas comprou e zere quando vender. O valor segue o preço por caixa do jogo, que sobe com a quantidade vendida de uma vez.'),
      h('div', { class: 'wh-list' }, c.list.map(warehouseRow)),
      addWarehouse('warehouse', 'Tenho esta', max, c.list.map(w => w.point)));
    return shell('cargo', c.tone, head, body);
  }

  // ---------- Vehicle warehouse ----------
  function vehiclesCard() {
    const v = vehicles();
    const set = cars => App.act(window.gta.warehouse('cars', Math.max(0, Math.min(v.cap, cars))));
    const head = row('vehicles', 'Vehicle Warehouse', v.pt ? `Import/Export · ${v.pt.name}` : 'Import/Export',
      [h('span', { class: `pill sm ${PILL[v.tone]}` }, v.pill)],
      [meter('Carros', 'cars', (v.cars / v.cap) * 100, 'var(--biz-c)', `${v.cars}/${v.cap}`)],
      [h('button', { class: 'btn primary icon sm', title: 'Guardei um carro', 'aria-label': 'Guardei um carro', disabled: v.cars >= v.cap, onclick: () => set(v.cars + 1) }, icon('plus', 15)),
        h('button', { class: 'btn secondary icon sm', title: 'Vendi um carro', 'aria-label': 'Vendi um carro', disabled: !v.cars, onclick: () => set(v.cars - 1) }, icon('dollar', 15)),
        h('span', { class: 'nightclub-spacer' })]);
    if (!expanded.has('vehicles')) return shell('vehicles', v.tone, head, null);
    const input = numberInput(v.cars, { min: 0, max: v.cap, step: 1, class: 'small', onchange: e => set(Number(e.target.value) || 0) });
    const body = h('div', { class: 'biz-more' },
      h('div', { class: 'row' }, h('span', { class: 'muted small' }, 'Carros guardados agora'), input),
      h('div', { class: 'biz-tools' },
        h('span', { class: 'grow' }),
        h('button', { class: 'btn danger sm', onclick: () => App.act(window.gta.mapOwn(v.point, false)) }, 'Não tenho mais')));
    return shell('vehicles', v.tone, head, body);
  }

  // Cards for what the player has, in this order.
  function cards(onRender) {
    rerender = onRender;
    const s = App.state;
    return [
      s.nightclub.owned ? nightclubCard() : null,
      s.warehouses.cargo.length ? cargoCard() : null,
      s.warehouses.vehicle.point ? vehiclesCard() : null
    ].filter(Boolean);
  }

  // "Outros negócios" rows for what the player does not have yet.
  function others() {
    const s = App.state;
    const out = [];
    const rowOf = (id, title, meta, action) => h('div', { class: 'row-item' }, bizIcon(id),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, title), h('div', { class: 'meta' }, meta)), action);
    if (!s.nightclub.owned) {
      out.push(rowOf('nightclub', 'Nightclub', 'After Hours',
        h('button', { class: 'btn secondary sm', onclick: () => App.act(window.gta.nightclub('own', true)) }, icon('plus', 15), 'Tenho este')));
    }
    if (!s.warehouses.cargo.length && hasPoints('warehouse')) out.push(rowOf('cargo', 'Special Cargo (CEO)', 'Escolha a warehouse', addWarehouse('warehouse', 'Tenho esta', 5, [])));
    if (!s.warehouses.vehicle.point && hasPoints('vehicle-warehouse')) out.push(rowOf('vehicles', 'Vehicle Warehouse', 'Import/Export', addWarehouse('vehicle-warehouse', 'Tenho esta', 1, [])));
    return out;
  }

  // Live values of the Nightclub card, every second.
  function onSecond(root) {
    const el = root.querySelector('[data-extra=nightclub]');
    if (!el) return;
    const { p, tone, pill, text } = nightclub();
    const set = (live, fn) => { for (const node of el.querySelectorAll(`[data-live=${live}]`)) fn(node); };
    set('nc-stock', n => { n.style.width = `${(p.value / p.maxValue) * 100}%`; });
    set('nc-stock-text', n => { n.textContent = `${moneyShort(p.value)} / ${moneyShort(p.maxValue).replace('GTA$ ', '')}`; });
    set('value', n => { n.textContent = money(p.value); });
    set('status', n => { n.textContent = text; });
    set('pill', n => { n.textContent = pill; n.className = `pill sm ${PILL[tone]}`; });
    el.classList.remove('ok', 'warning', 'stopped', 'ready');
    el.classList.add(tone);
    for (const g of p.goods) {
      const r = el.querySelector(`[data-good=${g.id}]`);
      if (!r) continue;
      r.querySelector('.bar i').style.width = `${(g.stock / g.cap) * 100}%`;
      r.querySelector('[data-live=units]').textContent = `${Math.floor(g.stock + 1e-9)}/${g.cap}`;
      r.querySelector('[data-live=gvalue]').textContent = money(g.value);
      r.querySelector('[data-live=gstate]').textContent = !g.active ? 'sem técnico' : g.minutesToFull > 0 ? `cheio em ${P.formatMinutes(g.minutesToFull)}` : 'cheio';
    }
  }

  window.BizExtra = { cards, others, onSecond, attention, nightclub, cargo, vehicles };
})();
