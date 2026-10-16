(function () {
  'use strict';
  const { h, icon, segmented, checkbox } = UI;
  const PRINTS = ['S', 'O', 'J', 'L'];
  const SIZES = [{ value: 'sm', label: 'Pequeno' }, { value: 'md', label: 'Médio' }, { value: 'lg', label: 'Grande' }];
  const OPACITY = [{ value: 0.7, label: '70%' }, { value: 0.85, label: '85%' }, { value: 1, label: '100%' }];
  let root = null;
  let recording = null; // id of the shortcut being recorded

  // Records the next key combo for one action. Global shortcuts are suspended meanwhile so the
  // current combo reaches this window instead of firing the overlay.
  function startRecording(id) {
    stopRecording();
    recording = id;
    window.addEventListener('keydown', onKey, true);
    App.act(window.gta.overlay('suspend-hotkeys', true));
  }
  async function stopRecording(accel) {
    if (!recording) return;
    const id = recording;
    recording = null;
    window.removeEventListener('keydown', onKey, true);
    if (accel) await App.act(window.gta.overlay('configure', { key: { id, accel } }));
    await App.act(window.gta.overlay('suspend-hotkeys', false));
  }
  function onKey(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { stopRecording(); return; }
    const accel = GtaHotkeys.fromEvent(e);
    if (accel) stopRecording(accel);
  }

  const ov = (action, value) => App.act(window.gta.overlay(action, value));

  function render() {
    const o = App.state.overlay;
    const s = App.state.settings.overlay;
    UI.fill(root, 
      h('div', { class: 'fp-top' },
        h('p', { class: 'muted small' }, 'Overlay por cima do jogo com as 4 peças certas de cada digital do hack. O app só mostra a imagem, você clica no jogo.'),
        h('div', { class: 'actions' },
          o.interact ? h('button', { class: 'btn ok', onclick: () => ov('interact', false) }, 'Terminar de mover') : null,
          h('button', { class: `btn ${o.visible ? 'secondary' : 'primary'}`, onclick: () => ov(o.visible ? 'hide' : 'show') },
            icon(o.visible ? 'eyeOff' : 'eye', 16), o.visible ? 'Esconder overlay' : 'Mostrar overlay'))),
      h('div', { class: 'banner info' }, icon('info', 20),
        h('div', { class: 'grow' },
          h('div', { class: 'title' }, 'Use o GTA em Janela sem bordas'),
          h('div', { class: 'text' }, 'Em Configurações > Gráficos, deixe o modo de tela como Janela sem bordas. Em tela cheia exclusiva o Windows não deixa nenhuma janela ficar por cima do jogo.'))),
      o.hotkeysFailed.length
        ? h('div', { class: 'banner warn' }, icon('alert', 20), h('div', { class: 'grow' },
          h('div', { class: 'title' }, 'Alguns atalhos não foram registrados'),
          h('div', { class: 'text' }, `Outro programa já usa: ${o.hotkeysFailed.join(', ')}. Feche esse programa e reabra o GTA Helper.`)))
        : null,
      h('div', { class: 'card pad' },
        h('div', { class: 'card-head' }, h('h3', null, icon('fingerprint', 18), 'As 4 digitais'),
          h('span', { class: 'hint' }, 'Clique numa pra mostrar ela no overlay')),
        h('div', { class: 'fp-grid' }, [...PRINTS.map(p => tile(p, o.keys[p], s.print === p)), allTile(o.keys.all, s.print === 'all')]),
        h('div', { class: 'fp-how' },
          h('b', null, 'Como usar no hack: '),
          `quando a digital grande aparecer, aperte ${o.keys.all} e veja qual das 4 ela é. Aperte o atalho dela (${PRINTS.map(p => o.keys[p]).join(', ')}) e marque no jogo as peças iguais às 4 da coluna da esquerda do overlay. As posições das peças mudam a cada tentativa, então compare pelo desenho.`)),
      h('div', { class: 'grid fp-bottom' },
        h('div', { class: 'card pad' },
          h('div', { class: 'card-head' }, h('h3', null, icon('settings', 18), 'Overlay')),
          h('div', { class: 'settings-rows' },
            setting('Tamanho', null, segmented(SIZES, s.size, v => ov('configure', { size: v }))),
            setting('Opacidade', null, segmented(OPACITY, OPACITY.reduce((a, b) => (Math.abs(b.value - s.opacity) < Math.abs(a.value - s.opacity) ? b : a)).value, v => ov('configure', { opacity: v }))),
            setting('Posição', 'Ligue o modo mover e arraste pela barra de cima do overlay.',
              h('div', { class: 'flex gap-8' },
                h('button', { class: 'btn secondary sm', onclick: () => ov('interact', !o.interact) }, icon('move', 15), o.interact ? 'Parar de mover' : 'Mover'),
                h('button', { class: 'btn ghost sm', onclick: () => ov('configure', { resetPosition: true }) }, 'Voltar pro canto'))),
            checkbox('Atalhos de teclado', s.hotkeys, e => ov('configure', { hotkeys: e.target.checked }), 'Funcionam com o jogo em foco. O app não envia teclas pro jogo.'))),
        h('div', { class: 'card pad' },
          h('div', { class: 'card-head' }, h('h3', null, icon('keyboard', 18), 'Atalhos'), h('span', { class: 'grow' }),
            h('button', { class: 'btn ghost sm', onclick: () => ov('configure', { resetKeys: true }) }, 'Restaurar padrão')),
          h('div', { class: 'keys' }, GtaHotkeys.ACTIONS.map(a => h('div', { class: `key-row ${o.hotkeysFailed.includes(o.keys[a.id]) ? 'failed' : ''}` },
            h('button', {
              class: `kbd key-btn ${recording === a.id ? 'recording' : ''}`,
              title: 'Clique e aperte a nova combinação (Esc cancela)',
              onclick: () => (recording === a.id ? stopRecording() : startRecording(a.id))
            }, recording === a.id ? 'Aperte as teclas…' : o.keys[a.id]),
            h('span', null, a.label)))),
          h('p', { class: 'muted small keys-note' }, 'Clique num atalho e aperte a nova combinação. Use Ctrl, Alt ou Shift com uma letra, número ou tecla do numpad, ou uma tecla F1 a F24 sozinha. Esc cancela.'))));
  }

  function tile(p, key, active) {
    return h('button', { class: `fp-tile ${active ? 'active' : ''}`, onclick: () => ov('print', p) },
      h('img', { src: `assets/fingerprints/${p}.png`, alt: `Digital ${p}`, draggable: 'false' }),
      h('span', { class: 'fp-label' }, h('b', null, p), h('span', { class: 'kbd' }, key)));
  }

  function allTile(key, active) {
    return h('button', { class: `fp-tile all ${active ? 'active' : ''}`, onclick: () => ov('print', 'all') },
      h('div', { class: 'fp-mini' }, PRINTS.map(p => h('img', { src: `assets/fingerprints/${p}.png`, alt: '', draggable: 'false' }))),
      h('span', { class: 'fp-label' }, h('b', null, 'Todas'), h('span', { class: 'kbd' }, key)));
  }

  function setting(label, hint, control) {
    return h('div', { class: 'setting' },
      h('div', { class: 'grow' }, h('div', { class: 'toggle-label' }, label), hint ? h('small', null, hint) : null),
      control);
  }

  // Rendered as the "Digitais" tab of the Casino page.
  window.CasinoFingerprint = {
    mount(el) { stopRecording(); root = el; render(); },
    onState() { if (root && root.isConnected) render(); }
  };
})();
