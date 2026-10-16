(function () {
  'use strict';
  const { h, money, pct, number, numberInput, checkbox } = UI;
  const P = GtaProduction;
  const UPGRADE_LABELS = { equipment: 'Equipamento', staff: 'Funcionários', security: 'Segurança' };
  let root = null;

  function current(def, biz) {
    return P.project(def, biz, biz.activeMinutes + (biz.owned ? App.extraMinutes() : 0));
  }

  function statusText(def, p) {
    if (p.producing) {
      return p.stopsOn === 'supply'
        ? `Produzindo. Suprimento acaba em ${P.formatMinutes(p.minutesToSupplyEmpty)}`
        : `Produzindo. Estoque enche em ${P.formatMinutes(p.minutesToFull)}`;
    }
    if (p.stock >= def.capacity - 1e-9) return 'Parado: estoque cheio, hora de vender';
    return 'Parado: sem suprimentos';
  }

  function tone(p) {
    if (!p.producing) return 'stopped';
    if (p.minutesToStop <= App.state.settings.warnMinutes) return 'warning';
    return 'ok';
  }

  function card(def) {
    const biz = App.state.businesses[def.id];
    const gta = window.gta;
    if (!biz.owned) {
      return h('article', { class: 'card biz not-owned' },
        h('div', { class: 'biz-head' }, icon(def), h('h3', null, def.name), h('span', { class: 'tag' }, def.group)),
        h('button', { onclick: () => App.act(gta.setOwned(def.id, true)) }, 'Tenho este negócio'));
    }
    const p = current(def, biz);
    const r = p.rates;
    const supplyInput = numberInput(Math.round(p.supplyPct), { min: 0, max: 100, step: 1, class: 'small' });
    const stockInput = numberInput(Math.floor(p.stock), { min: 0, max: def.capacity, step: 1, class: 'small' });
    const barInput = numberInput(biz.calibration.barMinutes || '', { min: 1, step: 1, placeholder: Math.round(r.barMinutes), class: 'small' });
    const mpuInput = numberInput(biz.calibration.minutesPerUnit || '', { min: 0.1, step: 0.1, placeholder: number(r.minutesPerUnit), class: 'small' });

    return h('article', { class: `card biz ${tone(p)}`, dataset: { id: def.id } },
      h('div', { class: 'biz-head' },
        icon(def),
        h('h3', null, def.name),
        h('span', { class: 'tag' }, def.group),
        h('span', { class: 'status', dataset: { live: 'status' } }, statusText(def, p))),
      h('div', { class: 'upgrades' }, def.upgrades.map(key =>
        h('button', {
          class: `chip ${biz.upgrades[key] ? 'on' : ''}`,
          title: key === 'security' ? 'Não muda a produção, só protege contra ataques' : '',
          onclick: () => App.act(gta.setUpgrades(def.id, { ...biz.upgrades, [key]: !biz.upgrades[key] }))
        }, UPGRADE_LABELS[key]))),
      meter('Suprimentos', p.supplyPct, 100, 'supply', pct(p.supplyPct)),
      meter('Estoque', p.stock, def.capacity, 'stock', `${Math.floor(p.stock)}/${def.capacity} · ${money(p.stockValue)}`),
      h('div', { class: 'actions' },
        h('button', { class: 'primary', onclick: () => App.act(gta.setSupply(def.id, 100)) }, 'Ressupri (100%)'),
        h('button', { onclick: () => App.act(gta.setStock(def.id, 0)) }, 'Vendi tudo')),
      h('details', null,
        h('summary', null, 'Ajustar e calibrar'),
        h('div', { class: 'adjust' },
          h('div', { class: 'row' }, h('span', null, 'Suprimento atual (%)'), supplyInput,
            h('button', { onclick: () => App.act(gta.setSupply(def.id, supplyInput.value)) }, 'Salvar')),
          h('div', { class: 'row' }, h('span', null, 'Estoque atual (unidades)'), stockInput,
            h('button', { onclick: () => App.act(gta.setStock(def.id, stockInput.value)) }, 'Salvar')),
          h('p', { class: 'muted' },
            `Estimativa: 1 unidade a cada ${number(r.minutesPerUnit)} min, barra cheia dura ${P.formatMinutes(r.barMinutes)}, estoque vazio até cheio em ${P.formatMinutes(r.fullStockMinutes)}. Se medir diferente no jogo, informe abaixo.`),
          h('div', { class: 'row' }, h('span', null, 'Barra cheia dura (min)'), barInput),
          h('div', { class: 'row' }, h('span', null, 'Minutos por unidade'), mpuInput),
          h('div', { class: 'row' },
            h('button', { onclick: () => App.act(gta.setCalibration(def.id, { barMinutes: Number(barInput.value) || null, minutesPerUnit: Number(mpuInput.value) || null })) }, 'Aplicar calibração'),
            h('button', { onclick: () => App.act(gta.setCalibration(def.id, {})) }, 'Voltar ao padrão'),
            h('button', { class: 'danger', onclick: () => App.act(gta.setOwned(def.id, false)) }, 'Não tenho mais')))));
  }

  function icon(def) {
    return h('span', { class: `biz-icon biz-${def.id}` }, h('img', { src: `assets/icons/${def.id}.svg`, alt: '' }));
  }

  function meter(label, value, max, kind, text) {
    return h('div', { class: 'meter' },
      h('div', { class: 'meter-label' }, h('span', null, label), h('span', { dataset: { live: `${kind}-text` } }, text)),
      h('div', { class: `meter-track ${kind}` }, h('div', { class: 'meter-fill', dataset: { live: kind }, style: `width:${(value / max) * 100}%` })));
  }

  function render() {
    if (!root) return;
    const open = new Set([...root.querySelectorAll('.card.biz[data-id] details[open]')].map(d => d.closest('.card').dataset.id));
    const defs = App.data.catalog.businesses;
    const owned = defs.filter(d => App.state.businesses[d.id].owned);
    const others = defs.filter(d => !App.state.businesses[d.id].owned);
    root.replaceChildren(
      h('div', { class: 'page-head' },
        h('h1', null, 'Negócios'),
        h('p', { class: 'muted' }, 'Os timers contam tempo de jogo online. Fechou o GTA, eles param. Ao ressuprir ou vender no jogo, marque aqui.')),
      owned.length ? h('div', { class: 'grid' }, owned.map(card)) : h('p', { class: 'empty' }, 'Marque abaixo os negócios que você tem.'),
      others.length ? h('h2', null, 'Outros negócios') : null,
      others.length ? h('div', { class: 'grid compact' }, others.map(card)) : null);
    for (const id of open) {
      const details = root.querySelector(`.card.biz[data-id="${id}"] details`);
      if (details) details.open = true;
    }
  }

  // Updates countdowns and bars in place every second, without rebuilding inputs.
  function onSecond() {
    if (!root) return;
    for (const el of root.querySelectorAll('.card.biz[data-id]')) {
      const def = App.data.catalog.businesses.find(d => d.id === el.dataset.id);
      const p = current(def, App.state.businesses[def.id]);
      el.querySelector('[data-live=status]').textContent = statusText(def, p);
      el.querySelector('[data-live=supply]').style.width = `${p.supplyPct}%`;
      el.querySelector('[data-live=stock]').style.width = `${(p.stock / def.capacity) * 100}%`;
      el.querySelector('[data-live=supply-text]').textContent = pct(p.supplyPct);
      el.querySelector('[data-live=stock-text]').textContent = `${Math.floor(p.stock)}/${def.capacity} · ${money(p.stockValue)}`;
      el.classList.remove('ok', 'warning', 'stopped');
      el.classList.add(tone(p));
    }
  }

  window.Pages = window.Pages || {};
  window.Pages.businesses = {
    mount(el) { root = el; render(); },
    onState(_state, force) { if (force && root && root.isConnected) render(); },
    onSecond() { if (root && root.isConnected) onSecond(); }
  };
})();
