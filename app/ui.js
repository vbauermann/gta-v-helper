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
    // A <label> would forward clicks to the first button of a segmented control, so only wrap real inputs.
    const tag = ['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName) ? 'label' : 'div';
    return h(tag, { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null);
  }

  function numberInput(value, attrs) {
    return h('input', { type: 'number', value: String(value), ...attrs, class: `input ${(attrs && attrs.class) || ''}` });
  }

  function select(options, value, attrs) {
    return h('select', { ...attrs, class: `input ${(attrs && attrs.class) || ''}` },
      options.map(o => h('option', { value: o.value, selected: o.value === value }, o.label)));
  }

  // Nexo-style switch row: label (with optional hint) on the left, toggle on the right.
  function checkbox(label, checked, onchange, hint) {
    return h('label', { class: 'toggle' },
      h('span', { class: 'grow' }, h('span', { class: 'toggle-label' }, label), hint ? h('small', null, hint) : null),
      h('input', { type: 'checkbox', class: 'switch', checked: !!checked, onchange }));
  }

  function segmented(options, value, onchange) {
    const box = h('div', { class: 'segmented' });
    const draw = current => box.replaceChildren(...options.map(o => h('button', {
      type: 'button', class: o.value === current ? 'active' : '',
      onclick: () => { draw(o.value); onchange(o.value); }
    }, o.label)));
    draw(value);
    return box;
  }

  const icon = (name, size) => window.Icons.icon(name, size);
  // Business badge: the in-game blip silhouette tinted with the business colour (see app.css).
  const bizIcon = (id, size = 34) => {
    const el = h('span', { class: `cat-icon biz biz-${id}` }, icon(id, Math.round(size * 0.58)));
    el.style.width = el.style.height = `${size}px`;
    return el;
  };

  // Circular progress like Nexo's Ring. Returns the element; call el.set(value, display) to update.
  function ring(value, { size = 96, stroke = 10, color = 'var(--accent)', label = '', display } = {}) {
    const NS = 'http://www.w3.org/2000/svg';
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const circle = cls => {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', size / 2);
      el.setAttribute('cy', size / 2);
      el.setAttribute('r', r);
      el.setAttribute('stroke-width', stroke);
      if (cls) el.setAttribute('class', cls);
      return el;
    };
    const track = circle();
    track.setAttribute('stroke', 'var(--ring-track)');
    const arc = circle('arc');
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute('stroke-dasharray', c);
    arc.setAttribute('stroke-dashoffset', c);
    svg.append(track, arc);
    const b = h('b', { class: 'num' });
    const el = h('div', { class: 'ring' }, svg, h('div', { class: 'center' }, b, label ? h('span', null, label) : null));
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    let ready = false;
    let latest = [value, display];
    const apply = (v, text, col) => {
      const clamped = Math.min(100, Math.max(0, v || 0));
      arc.setAttribute('stroke-dashoffset', c * (1 - clamped / 100));
      if (col) arc.setAttribute('stroke', col);
      b.textContent = text != null ? text : `${Math.round(clamped)}%`;
    };
    // The first value animates in from empty after the ring is on screen; later calls apply at once.
    el.set = (v, text, col) => { if (ready) apply(v, text, col); else latest = [v, text, col]; };
    arc.setAttribute('stroke', color);
    b.textContent = display != null ? display : `${Math.round(value)}%`;
    requestAnimationFrame(() => { ready = true; apply(...latest); });
    return el;
  }

  function bar(value, color, cls) {
    const fill = h('i');
    fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
    fill.style.background = color;
    return h('div', { class: `bar ${cls || ''}` }, fill);
  }

  const compactFmt = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const moneyShort = v => `GTA$ ${compactFmt.format(Math.round(v || 0))}`;

  // replaceChildren that skips null/false like h() does (the DOM method would print "null").
  function fill(el, ...children) {
    el.replaceChildren(...children.flat(Infinity).filter(c => c != null && c !== false)
      .map(c => (c instanceof Node ? c : document.createTextNode(String(c)))));
  }

  window.UI = { fill, h, money, moneyShort, pct, number, field, numberInput, select, checkbox, segmented, icon, bizIcon, ring, bar };
})();
