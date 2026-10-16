// Renderer of the fingerprint overlay window. Shows the reference sheet; in move mode it also
// gets a small toolbar (pick print, size, done). Nothing here talks to the game.
(function () {
  'use strict';
  const { h } = UI;
  const PRINTS = ['S', 'O', 'J', 'L'];
  const SIZES = [['sm', 'P'], ['md', 'M'], ['lg', 'G']];
  const ov = document.getElementById('ov');
  const head = document.getElementById('head');
  const body = document.getElementById('body');
  let shown = '';

  const set = patch => window.overlay.set(patch);
  const img = p => h('img', { src: `assets/fingerprints/${p}.png`, alt: `Digital ${p}`, draggable: 'false' });

  function render(s) {
    ov.style.opacity = String(s.opacity);
    ov.classList.toggle('interact', s.interact);
    const title = s.print === 'all' ? 'Digitais do Casino' : `Digital ${s.print}`;
    if (s.interact) {
      UI.fill(head,
        h('div', { class: 'ov-row' },
          h('span', { class: 'ov-title' }, 'Arraste pra mover'),
          h('span', { class: 'ov-tools' }, h('button', { class: 'done', onclick: () => set({ interact: false }) }, 'Pronto'))),
        h('div', { class: 'ov-row' },
          h('span', { class: 'ov-tools left' },
            [...PRINTS, 'all'].map((p, i) => h('button', { class: s.print === p ? 'on' : '', title: `Ctrl+Shift+${p === 'all' ? 0 : i + 1}`, onclick: () => set({ print: p }) }, p === 'all' ? 'Todas' : p))),
          h('span', { class: 'ov-tools' },
            SIZES.map(([v, l]) => h('button', { class: s.size === v ? 'on' : '', title: 'Tamanho', onclick: () => set({ size: v }) }, l)))));
    } else {
      UI.fill(head, h('div', { class: 'ov-row' }, h('span', { class: 'ov-title' }, title), h('span', { class: 'ov-hint' }, 'Ctrl+Shift+F esconde')));
    }
    // Only swap the images when the selection changes, so they never flicker.
    if (shown !== s.print) {
      shown = s.print;
      body.className = `ov-body ${s.print === 'all' ? 'all' : 'one'}`;
      body.replaceChildren(...(s.print === 'all' ? PRINTS.map(img) : [img(s.print)]));
    }
  }

  window.overlay.onState(render);
})();
