(function () {
  'use strict';
  const { h, numberInput, select, checkbox, segmented, icon } = UI;
  let root = null;

  function section(iconName, title, ...rows) {
    return h('div', { class: 'card pad settings-card' },
      h('div', { class: 'card-head' }, h('h3', null, icon(iconName, 18), title)),
      h('div', { class: 'settings-rows' }, rows));
  }

  function setting(label, hint, control) {
    return h('div', { class: 'setting' },
      h('div', { class: 'grow' }, h('div', { class: 'toggle-label' }, label), hint ? h('small', null, hint) : null),
      control);
  }

  function render() {
    const s = App.state.settings;
    const set = patch => App.act(window.gta.setSettings(patch));
    UI.fill(root, 
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Ajustes'), h('div', { class: 'sub' }, 'Como o app conta o tempo e te avisa.'))),
      h('div', { class: 'settings-grid' },
        section('clock', 'Contagem de tempo',
          setting('Quando contar o tempo de produção',
            App.state.detectionSupported
              ? 'O app só olha a lista de processos do Windows (GTA5.exe ou GTA5_Enhanced.exe). Não lê nem mexe no jogo.'
              : 'A detecção do GTA só funciona no Windows.',
            select([
              { value: 'auto', label: 'Só com o GTA aberto' },
              { value: 'always', label: 'Sempre com o app aberto' }
            ], s.detection, { onchange: e => set({ detection: e.target.value }) })),
          checkbox('Timers pausados', s.paused, e => set({ paused: e.target.checked }), 'Use no modo história, no menu ou em loading longo.')),
        section('bell', 'Avisos',
          setting('Avisar quando faltar', 'Minutos de jogo antes de parar. 0 desliga o aviso antecipado.',
            numberInput(s.warnMinutes, { min: 0, max: 120, step: 1, class: 'small', onchange: e => set({ warnMinutes: Number(e.target.value) || 0 }) })),
          checkbox('Notificações do Windows', s.notify, e => set({ notify: e.target.checked })),
          checkbox('Fechar mantém na bandeja', s.closeToTray, e => set({ closeToTray: e.target.checked }), 'Os timers continuam com a janela fechada.')),
        section('palette', 'Aparência',
          setting('Tema', null, segmented([{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }], s.theme || 'dark', v => set({ theme: v })))),
        section('info', 'Sobre os números',
          App.data.catalog.notes.map(n => h('p', { class: 'muted small note' }, n)))));
  }

  window.Pages = window.Pages || {};
  window.Pages.settings = {
    mount(el) { root = el; render(); },
    onState(_s, force) { if (force && root && root.isConnected) render(); }
  };
})();
