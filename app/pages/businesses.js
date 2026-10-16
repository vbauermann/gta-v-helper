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
    const supplyInput = numberInput(Math.round(p.supplyPct), { min: 0, max: 100, step: 1, class: 'small' });
    const stockInput = numberInput(Math.floor(p.stock), { min: 0, max: def.capacity, step: 1, class: 'small' });
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
        calibrated ? h('span', { class: 'pill sm info', title: 'Usando tempos medidos por você' }, 'calibrado') : null),
      h('details', { class: 'adjust-box' },
        h('summary', null, icon('settings', 15), 'Ajustar e calibrar'),
        h('div', { class: 'adjust' },
          h('div', { class: 'row' }, h('span', null, 'Suprimento atual (%)'), supplyInput,
            h('button', { class: 'btn secondary sm', onclick: () => App.act(gta.setSupply(def.id, supplyInput.value)) }, 'Salvar')),
          h('div', { class: 'row' }, h('span', null, 'Estoque atual (unidades)'), stockInput,
            h('button', { class: 'btn secondary sm', onclick: () => App.act(gta.setStock(def.id, stockInput.value)) }, 'Salvar')),
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
