// Tiny DOM helpers. Everything goes through textContent, so no user value is parsed as HTML.
(function () {
  'use strict';

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key === 'class') el.className = value;
      else if (key === 'style') el.style.cssText = value; // CSSOM, allowed by the CSP
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key in el && typeof value !== 'string') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  const moneyFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const money = v => `GTA$ ${moneyFmt.format(Math.round(v || 0))}`;
  const pct = v => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')}%`;
  const number = v => (Math.round(v * 100) / 100).toLocaleString('pt-BR');

  function field(label, input, hint) {
    return h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null);
  }

  function numberInput(value, attrs) {
    return h('input', { type: 'number', value: String(value), ...attrs });
  }

  function select(options, value, attrs) {
    return h('select', attrs, options.map(o => h('option', { value: o.value, selected: o.value === value }, o.label)));
  }

  function checkbox(label, checked, onchange) {
    return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!checked, onchange }), h('span', null, label));
  }

  window.UI = { h, money, pct, number, field, numberInput, select, checkbox };
})();
