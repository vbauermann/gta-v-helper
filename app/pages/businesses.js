(function () {
  'use strict';
  const { h, money, number, numberInput, icon, bizIcon, ring, bar } = UI;
  const P = GtaProduction;
  const UPGRADE_LABELS = { equipment: 'Equipamento', staff: 'Funcionários', security: 'Segurança' };
  let root = null;

  const PILL = { ok: 'ok', warning: 'warn', stopped: 'danger' };
  const supplyColor = v => (v <= 15 ? 'var(--danger)' : v <= 35 ? 'var(--warn)' : 'var(--ok)');
  const stockText = (def, p) => `${Math.floor(p.stock)}/${def.capacity}`;

  function card(def) {
    const gta = window.gta;
    const { biz, p, tone, text, pill } = App.business(def);
    const r = p.rates;
    const barInput = numberInput(biz.calibration.barMinutes || '', { min: 1, step: 1, placeholder: Math.round(r.barMinutes), class: 'small' });
    const mpuInput = numberInput(biz.calibration.minutesPerUnit || '', { min: 0.1, step: 0.1, placeholder: number(r.minutesPerUnit), class: 'small' });
    const supplyRing = ring(p.supplyPct, { size: 92, stroke: 9, label: 'suprimento', color: supplyColor(p.supplyPct) });
    supplyRing.dataset.live = 'ring';
    const stockBar = bar((p.stock / def.capacity) * 100, `var(--biz-c)`);
    stockBar.firstChild.dataset.live = 'stock';
    const calibrated = biz.calibration.barMinutes || biz.calibration.minutesPerUnit;

    return h('article', { class: `card pad biz biz-${def.id} ${tone}`, dataset: { id: def.id } },
      h('div', { class: 'card-head' },
        bizIcon(def.id, 40),
        h('div', { class: 'grow' }, h('h3', null, def.name), h('div', { class: 'meta' }, def.group)),
        h('span', { class: `pill ${PILL[tone]}`, dataset: { live: 'pill' } }, pill)),
      h('div', { class: 'biz-body' },
        supplyRing,
        h('div', { class: 'biz-stats grow' },
          h('div', { class: 'stat-line' }, h('span', null, 'Estoque'), h('b', { class: 'num', dataset: { live: 'stock-text' } }, stockText(def, p))),
          stockBar,
          h('div', { class: 'stat-line' }, h('span', null, 'Valor'), h('b', { class: 'num', dataset: { live: 'value' } }, money(p.stockValue))),
          h('div', { class: 'biz-status', dataset: { live: 'status' } }, text))),
      h('div', { class: 'upgrades' },
        h('span', { class: 'upgrades-label' }, 'Upgrades'),
        def.upgrades.map(key => h('button', {
          class: `chip ${biz.upgrades[key] ? 'on' : ''}`,
          title: key === 'security' ? 'Não muda a produção, só protege contra ataques' : '',
          onclick: () => App.act(gta.setUpgrades(def.id, { ...biz.upgrades, [key]: !biz.upgrades[key] }))
        }, UPGRADE_LABELS[key]))),
      h('div', { class: 'biz-actions' },
        h('button', { class: 'btn primary sm', onclick: () => App.act(gta.setSupply(def.id, 100)) }, icon('box', 15), 'Ressupri'),
        h('button', { class: 'btn secondary sm', onclick: () => App.act(gta.setStock(def.id, 0)) }, icon('dollar', 15), 'Vendi tudo'),
        h('button', { class: `btn ${reporting.has(def.id) ? 'secondary' : 'ghost'} sm`, onclick: () => toggleReport(def.id) }, icon('edit', 15), 'Informar níveis'),
        calibrated ? h('span', { class: 'pill sm info', title: 'Usando tempos medidos por você' }, 'calibrado') : null),
      reporting.has(def.id) ? reportPanel(def, p) : null,
      h('details', { class: 'adjust-box' },
        h('summary', null, icon('settings', 15), 'Ajustar e calibrar'),
        h('div', { class: 'adjust' },
          h('p', { class: 'muted small' },
            `Estimativa: 1 unidade a cada ${number(r.minutesPerUnit)} min, barra cheia dura ${P.formatMinutes(r.barMinutes)}, estoque vazio até cheio em ${P.formatMinutes(r.fullStockMinutes)}. Se medir diferente no jogo, informe abaixo.`),
          h('div', { class: 'row' }, h('span', null, 'Barra cheia dura (min)'), barInput),
          h('div', { class: 'row' }, h('span', null, 'Minutos por unidade'), mpuInput),
          h('div', { class: 'row' },
            h('button', { class: 'btn secondary sm', onclick: () => App.act(gta.setCalibration(def.id, { barMinutes: Number(barInput.value) || null, minutesPerUnit: Number(mpuInput.value) || null })) }, 'Aplicar calibração'),
            h('button', { class: 'btn ghost sm', onclick: () => App.act(gta.setCalibration(def.id, {})) }, 'Voltar ao padrão'),
            h('span', { class: 'grow' }),
            h('button', { class: 'btn danger sm', onclick: () => App.act(gta.setOwned(def.id, false)) }, 'Não tenho mais')))));
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
    const open = new Set([...root.querySelectorAll('.card.biz[data-id] details[open]')].map(d => d.closest('.card').dataset.id));
    const defs = App.data.catalog.businesses;
    const owned = defs.filter(d => App.state.businesses[d.id].owned);
    const others = defs.filter(d => !App.state.businesses[d.id].owned);
    UI.fill(root, 
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Negócios'),
          h('div', { class: 'sub' }, 'Os timers contam tempo de jogo online. Fechou o GTA, eles param. Ao ressuprir ou vender no jogo, marque aqui.'))),
      owned.length
        ? h('div', { class: 'grid biz-grid' }, owned.map(card))
        : h('div', { class: 'card' }, h('div', { class: 'empty' }, h('div', { class: 'icon' }, icon('businesses', 24)),
          h('h3', null, 'Nenhum negócio marcado'), h('p', null, 'Marque abaixo os negócios que você tem.'))),
      others.length
        ? h('div', { class: 'card pad others' },
          h('div', { class: 'card-head' }, h('h3', null, 'Outros negócios'), h('span', { class: 'hint' }, 'Marque os que você comprou')),
          h('div', { class: 'rows' }, others.map(otherRow)))
        : null);
    for (const id of open) {
      const details = root.querySelector(`.card.biz[data-id="${id}"] details`);
      if (details) details.open = true;
    }
  }

  // Updates countdowns, ring and bars in place every second, without rebuilding inputs.
  function onSecond() {
    if (!root) return;
    for (const el of root.querySelectorAll('.card.biz[data-id]')) {
      const def = App.data.catalog.businesses.find(d => d.id === el.dataset.id);
      const { p, tone, text, pill } = App.business(def);
      el.querySelector('[data-live=status]').textContent = text;
      el.querySelector('[data-live=ring]').set(p.supplyPct, null, supplyColor(p.supplyPct));
      el.querySelector('[data-live=stock]').style.width = `${(p.stock / def.capacity) * 100}%`;
      el.querySelector('[data-live=stock-text]').textContent = stockText(def, p);
      el.querySelector('[data-live=value]').textContent = money(p.stockValue);
      const pillEl = el.querySelector('[data-live=pill]');
      pillEl.textContent = pill;
      pillEl.className = `pill ${PILL[tone]}`;
      el.classList.remove('ok', 'warning', 'stopped');
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
