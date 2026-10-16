(function () {
  'use strict';
  const { h, field, numberInput, select, checkbox } = UI;
  let root = null;

  function render() {
    const s = App.state.settings;
    const set = patch => App.act(window.gta.setSettings(patch));
    const warn = numberInput(s.warnMinutes, { min: 0, max: 120, step: 1, onchange: e => set({ warnMinutes: Number(e.target.value) || 0 }) });
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', null, 'Configurações')),
      h('div', { class: 'card form narrow' },
        field('Quando contar o tempo de produção', select([
          { value: 'auto', label: 'Só com o GTA aberto (recomendado)' },
          { value: 'always', label: 'Sempre que o app estiver aberto' }
        ], s.detection, { onchange: e => set({ detection: e.target.value }) }),
          App.state.detectionSupported
            ? 'O app só olha a lista de processos do Windows (GTA5.exe ou GTA5_Enhanced.exe). Não lê nem mexe no jogo.'
            : 'A detecção do GTA só funciona no Windows.'),
        field('Avisar quando faltar (minutos de jogo)', warn, '0 desliga o aviso antecipado.'),
        checkbox('Notificações do Windows', s.notify, e => set({ notify: e.target.checked })),
        checkbox('Fechar a janela mantém o app na bandeja (os timers continuam)', s.closeToTray, e => set({ closeToTray: e.target.checked }))),
      h('div', { class: 'card narrow' },
        h('h3', null, 'Sobre os números'),
        App.data.catalog.notes.map(n => h('p', { class: 'muted' }, n))));
  }

  window.Pages = window.Pages || {};
  window.Pages.settings = {
    mount(el) { root = el; render(); },
    onState(_s, force) { if (force && root && root.isConnected) render(); }
  };
})();
