(function () {
  'use strict';
  const { h, money, number, numberInput, icon, bizIcon, bar } = UI;
  const P = GtaProduction;
  const UPGRADE_LABELS = { equipment: 'Equipamento', staff: 'Funcionários', security: 'Segurança' };
  let root = null;

  const PILL = { ok: 'blue', warning: 'warn', stopped: 'danger', ready: 'ok' };
  const supplyColor = v => (v <= 15 ? 'var(--danger)' : v <= 35 ? 'var(--warn)' : 'var(--ok)');
  const stockText = (def, p) => `${Math.floor(p.stock)}/${def.capacity}`;

  const supplyText = p => {
    const pct = `${Math.round(p.supplyPct)}%`;
    if (p.deliveryIn) return `${pct} · chega em ${P.formatMinutes(p.deliveryIn)}`;
    return p.supplyPct > 0.5 && p.minutesToSupplyEmpty > 0 ? `${pct} · acaba em ${P.formatMinutes(p.minutesToSupplyEmpty)}` : pct;
  };

  // One line per business, like the bars in the game: supply and stock. The rest opens on click.
  const expanded = new Set();
  function toggleRow(id) {
    if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
    render();
  }

  function meter(label, live, value, color, text) {
    const b = bar(value, color, 'thin');
    b.firstChild.dataset.live = live;
    return h('div', { class: 'meter' },
      h('span', { class: 'meter-label' }, label), b,
      h('b', { class: 'num meter-text', dataset: { live: `${live}-text` } }, text));
  }

  function card(def) {
    const gta = window.gta;
    const { biz, p, tone, text, pill } = App.business(def);
    const r = p.rates;
    const open = expanded.has(def.id);
    const barInput = numberInput(biz.calibration.barMinutes || '', { min: 1, step: 1, placeholder: Math.round(r.barMinutes), class: 'small' });
    const mpuInput = numberInput(biz.calibration.minutesPerUnit || '', { min: 0.1, step: 0.1, placeholder: number(r.minutesPerUnit), class: 'small' });
    const calibrated = biz.calibration.barMinutes || biz.calibration.minutesPerUnit;
    const stop = e => e.stopPropagation();

    const head = h('div', { class: 'biz-row', title: open ? 'Recolher' : 'Ver detalhes', onclick: () => toggleRow(def.id) },
      bizIcon(def.id, 36),
      h('div', { class: 'biz-name' },
        h('h3', null, def.name),
        h('div', { class: 'meta' }, def.group),
        h('div', { class: 'biz-pills' },
          h('span', { class: `pill sm ${PILL[tone]}`, dataset: { live: 'pill' } }, pill),
          def.boost && boostActive(biz, p) ? h('span', { class: 'pill sm info' }, icon('star', 12), 'Boost') : null,
          calibrated ? h('span', { class: 'pill sm', title: 'Usando tempos medidos por você' }, 'calibrado') : null)),
      h('div', { class: 'biz-meters' },
        meter('Estoque', 'stock', (p.stock / def.capacity) * 100, 'var(--biz-c)', stockText(def, p)),
        meter('Suprimento', 'supply', p.supplyPct, supplyColor(p.supplyPct), supplyText(p))),
      h('div', { class: 'biz-quick', onclick: stop },
        h('button', { class: 'btn primary icon sm', title: `Comprei suprimentos (chegam em ~${App.data.catalog.supplyDeliveryMinutes || 10} min de jogo)`, 'aria-label': 'Comprei suprimentos', onclick: () => App.act(gta.orderSupply(def.id)) }, icon('box', 15)),
        h('button', { class: 'btn secondary icon sm', title: 'Vendi tudo', 'aria-label': 'Vendi tudo', onclick: () => App.act(gta.setStock(def.id, 0)) }, icon('dollar', 15)),
        nightclubButton(def, biz),
        h('button', { class: `btn ghost icon sm biz-toggle ${open ? 'open' : ''}`, title: open ? 'Recolher' : 'Ver detalhes', 'aria-expanded': String(open), onclick: () => toggleRow(def.id) }, icon('chevron', 16))));

    const body = open ? h('div', { class: 'biz-more' },
      h('div', { class: 'biz-facts' },
        h('div', { class: 'stat-line' }, h('span', null, 'Valor do estoque'), h('b', { class: 'num', dataset: { live: 'value' } }, money(p.stockValue))),
        h('div', { class: 'biz-status', dataset: { live: 'status' } }, text),
        p.deliveryIn ? h('button', { class: 'btn ghost sm', title: 'Os suprimentos já estão no negócio', onclick: () => App.act(gta.setSupply(def.id, 100)) }, icon('check', 15), 'Já chegou') : null),
      h('div', { class: 'upgrades' },
        h('span', { class: 'upgrades-label' }, 'Upgrades'),
        def.upgrades.map(key => h('button', {
          class: `chip ${biz.upgrades[key] ? 'on' : ''}`,
          title: key === 'security' ? 'Não muda a produção, só protege contra ataques' : '',
          onclick: () => App.act(gta.setUpgrades(def.id, { ...biz.upgrades, [key]: !biz.upgrades[key] }))
        }, UPGRADE_LABELS[key]))),
      def.boost ? h('div', { class: 'boost-row' }, boostLine(def, biz, p), boostButton(def, biz, p)) : null,
      h('div', { class: 'biz-tools' },
        h('button', { class: `btn ${reporting.has(def.id) ? 'secondary' : 'ghost'} sm`, onclick: () => toggleReport(def.id) }, icon('edit', 15), 'Informar níveis'),
        h('button', { class: `btn ${adjusting.has(def.id) ? 'secondary' : 'ghost'} sm`, onclick: () => toggleAdjust(def.id) }, icon('settings', 15), 'Ajustar e calibrar')),
      reporting.has(def.id) ? reportPanel(def, p) : null,
      adjusting.has(def.id) ? h('div', { class: 'adjust' },
        h('p', { class: 'muted small' },
          `Estimativa: 1 unidade a cada ${number(r.minutesPerUnit)} min, barra cheia dura ${P.formatMinutes(r.barMinutes)}, estoque vazio até cheio em ${P.formatMinutes(r.fullStockMinutes)}. Se medir diferente no jogo, informe abaixo.`),
        h('div', { class: 'row' }, h('span', null, 'Barra cheia dura (min)'), barInput),
        h('div', { class: 'row' }, h('span', null, 'Minutos por unidade'), mpuInput),
        h('div', { class: 'row' },
          h('button', { class: 'btn secondary sm', onclick: () => App.act(gta.setCalibration(def.id, { barMinutes: Number(barInput.value) || null, minutesPerUnit: Number(mpuInput.value) || null })) }, 'Aplicar calibração'),
          h('button', { class: 'btn ghost sm', onclick: () => App.act(gta.setCalibration(def.id, {})) }, 'Voltar ao padrão'),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn danger sm', onclick: () => App.act(gta.setOwned(def.id, false)) }, 'Não tenho mais'))) : null) : null;

    return h('article', { class: `card biz biz-${def.id} ${tone} ${open ? 'open' : ''}`, dataset: { id: def.id } }, head, body);
  }

  // Toggle: a Nightclub technician also makes this business's goods. The Acid Lab has no Nightclub good.
  function nightclubButton(def, biz) {
    if (!def.nightclubGood) return h('span', { class: 'nightclub-spacer', title: 'O Acid Lab não tem técnico no Nightclub' });
    const on = !!biz.nightclub;
    const title = on
      ? `Vinculado ao Nightclub (${def.nightclubGood}). Clique para desvincular`
      : `Vincular ao Nightclub (${def.nightclubGood})`;
    return h('button', {
      class: `btn icon sm nightclub-toggle ${on ? 'on' : 'ghost'}`, title, 'aria-label': title, 'aria-pressed': String(on),
      onclick: () => App.act(window.gta.setNightclub(def.id, !on))
    }, icon('music', 15));
  }

  const adjusting = new Set();
  function toggleAdjust(id) {
    if (adjusting.has(id)) adjusting.delete(id); else adjusting.add(id);
    render();
  }

  // Daily boost (Acid Lab): the next units come out faster until they are made or 24 h pass.
  const dayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const boostActive = (biz, p) => !!(biz.boost && p.boostLeft > 0.01 && Date.now() < biz.boost.endsAt);

  function boostButton(def, biz, p) {
    return boostActive(biz, p)
      ? h('button', { class: 'btn ghost sm', title: 'Marquei sem querer', onclick: () => App.act(window.gta.boost(def.id, false)) }, icon('x', 15), 'Desfazer boost')
      : h('button', { class: 'btn secondary sm boost-btn', title: `Produção ${def.boost.speed}x mais rápida nas próximas ${def.boost.units} unidades`, onclick: () => App.act(window.gta.boost(def.id, true)) }, icon('star', 15), 'Dei boost');
  }

  function boostLine(def, biz, p) {
    if (boostActive(biz, p)) {
      return h('div', { class: 'boost-line on' }, icon('star', 14),
        h('span', null, h('b', null, `Boost ativo: faltam ${Math.ceil(p.boostLeft)} un. em ${def.boost.speed}x`),
          ` · vale até ${dayFmt.format(new Date(biz.boost.endsAt))} ou até acabar`));
    }
    if (biz.boost && biz.boost.startedAt) {
      return h('div', { class: 'boost-line' }, icon('star', 14), `Último boost: ${dayFmt.format(new Date(biz.boost.startedAt))}. Dá pra usar 1 vez por dia, na mesa das tintas.`);
    }
    return h('div', { class: 'boost-line' }, icon('star', 14), `Boost diário: ${def.boost.speed}x mais rápido nas próximas ${def.boost.units} unidades. Use na mesa das tintas e aperte "Dei boost".`);
  }

  // Panel to type the supply and stock bars as seen in the game (laptop or business computer).
  const reporting = new Set();
  const drafts = new Map(); // typed values survive re-renders while the panel is open
  function toggleReport(id) {
    if (reporting.has(id)) { reporting.delete(id); drafts.delete(id); } else reporting.add(id);
    render();
  }

  function reportPanel(def, p) {
    const stockPct = (p.stock / def.capacity) * 100;
    const draft = drafts.get(def.id) || {};
    const supply = numberInput(draft.supply != null ? draft.supply : Math.round(p.supplyPct), { min: 0, max: 100, step: 1 });
    const stock = numberInput(draft.stock != null ? draft.stock : Math.round(stockPct), { min: 0, max: 100, step: 1 });
    const keep = () => drafts.set(def.id, { supply: supply.value, stock: stock.value });
    supply.addEventListener('input', keep);
    stock.addEventListener('input', keep);
    const hint = h('small', null);
    const units = () => Math.min(def.capacity, Math.max(0, (Number(stock.value) || 0) / 100 * def.capacity));
    const updateHint = () => {
      const u = units();
      hint.textContent = `${number(u)} de ${def.capacity} unidades · ${money(u * p.rates.unitValue)}`;
    };
    stock.addEventListener('input', updateHint);
    updateHint();
    const save = async () => {
      await App.act(window.gta.setSupply(def.id, Math.min(100, Math.max(0, Number(supply.value) || 0))));
      await App.act(window.gta.setStock(def.id, units()));
      reporting.delete(def.id);
      drafts.delete(def.id);
      render();
    };
    for (const input of [supply, stock]) input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    return h('div', { class: 'report-box' },
      h('div', { class: 'report-title' }, 'Como está no jogo agora?'),
      h('div', { class: 'report-fields' },
        h('label', { class: 'field' }, h('span', null, 'Suprimentos (%)'), supply, h('small', null, 'A barra de suprimentos')),
        h('label', { class: 'field' }, h('span', null, 'Estoque (%)'), stock, hint)),
      h('div', { class: 'report-actions' },
        h('button', { class: 'btn primary sm', onclick: save }, 'Salvar'),
        h('button', { class: 'btn ghost sm', onclick: () => toggleReport(def.id) }, 'Cancelar')));
  }

  function otherRow(def) {
    return h('div', { class: 'row-item' },
      bizIcon(def.id),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, def.name), h('div', { class: 'meta' }, def.group)),
      h('button', { class: 'btn secondary sm', onclick: () => App.act(window.gta.setOwned(def.id, true)) }, icon('plus', 15), 'Tenho este'));
  }

  function render() {
    if (!root) return;
    const defs = App.data.catalog.businesses;
    const owned = defs.filter(d => App.state.businesses[d.id].owned);
    const others = defs.filter(d => !App.state.businesses[d.id].owned);
    const extra = BizExtra.cards(render);
    const extraOthers = BizExtra.others();
    UI.fill(root, 
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Negócios'),
          h('div', { class: 'sub' }, 'Os timers contam tempo de jogo online. Fechou o GTA, eles param. Ao ressuprir ou vender no jogo, marque aqui, ou abra o Master Control Terminal no Terrorbyte que o app lê sozinho.'))),
      owned.length || extra.length
        ? sortList(h('div', { class: 'biz-list' }, owned.map(card), extra))
        : h('div', { class: 'card' }, h('div', { class: 'empty' }, h('div', { class: 'icon' }, icon('businesses', 24)),
          h('h3', null, 'Nenhum negócio marcado'), h('p', null, 'Marque abaixo os negócios que você tem.'))),
      others.length || extraOthers.length
        ? h('div', { class: 'card pad others' },
          h('div', { class: 'card-head' }, h('h3', null, 'Outros negócios'), h('span', { class: 'hint' }, 'Marque os que você comprou')),
          h('div', { class: 'rows' }, others.map(otherRow), extraOthers))
        : null);
  }

  // One list for everything owned, Nightclub and warehouses included: ready to sell, producing,
  // running out, waiting for supplies, stopped. Same status: most supply first.
  const RANK = { 'Pronto para vender': 0, Produzindo: 1, Acabando: 2, Aguardando: 3, Parado: 4 };
  function sortKey(el) {
    if (el.dataset.id) {
      const b = App.business(App.data.catalog.businesses.find(d => d.id === el.dataset.id));
      return [RANK[b.pill] ?? 4, -b.p.supplyPct];
    }
    const x = BizExtra[el.dataset.extra]();
    // The Nightclub with no technician makes nothing: it counts as stopped. Warehouses are filled by hand.
    return [x.tone === 'ready' ? 0 : x.tone === 'warning' ? 4 : 1, -100];
  }

  // Puts the cards in order by moving the existing elements (open cards and inputs stay as they are).
  function sortList(list) {
    const items = [...list.children].map(el => ({ el, k: sortKey(el) }));
    items.sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1]);
    if (items.some((x, i) => x.el !== list.children[i])) for (const x of items) list.appendChild(x.el);
    return list;
  }

  // Updates countdowns and bars in place every second, without rebuilding inputs.
  function onSecond() {
    if (!root) return;
    BizExtra.onSecond(root);
    const list = root.querySelector('.biz-list');
    if (list) sortList(list);
    for (const el of root.querySelectorAll('.card.biz[data-id]')) {
      const def = App.data.catalog.businesses.find(d => d.id === el.dataset.id);
      const { p, tone, text, pill } = App.business(def);
      const set = (live, fn) => { const node = el.querySelector(`[data-live=${live}]`); if (node) fn(node); };
      set('status', n => { n.textContent = text; });
      set('supply', n => { n.style.width = `${p.supplyPct}%`; n.style.background = supplyColor(p.supplyPct); });
      set('supply-text', n => { n.textContent = supplyText(p); });
      set('stock', n => { n.style.width = `${(p.stock / def.capacity) * 100}%`; });
      set('stock-text', n => { n.textContent = stockText(def, p); });
      set('value', n => { n.textContent = money(p.stockValue); });
      const pillEl = el.querySelector('[data-live=pill]');
      pillEl.textContent = pill;
      pillEl.className = `pill sm ${PILL[tone]}`;
      el.classList.remove('ok', 'warning', 'stopped', 'ready');
      el.classList.add(tone);
    }
  }

  window.Pages = window.Pages || {};
  window.Pages.businesses = {
    mount(el) { root = el; render(); },
    onState(_state, force) { if (force && root && root.isConnected) render(); },
    onSecond() { if (root && root.isConnected) onSecond(); }
  };
})();
