(function () {
  'use strict';
  const { h } = UI;

  const App = {
    data: null,
    state: null,
    receivedAt: 0,
    page: 'businesses',
    pages: window.Pages || {},
    // Online minutes elapsed since the main process last ticked, for smooth second-by-second countdowns.
    extraMinutes() {
      if (!this.state || !this.state.counting) return 0;
      return Math.max(0, (Date.now() - this.receivedAt) / 60000);
    },
    async act(promise) {
      try {
        this.setState(await promise, true);
      } catch (error) {
        console.error(error);
      }
    },
    setState(state, force) {
      this.state = state;
      this.receivedAt = Date.now();
      renderStatus();
      const page = this.pages[this.page];
      const editing = document.activeElement && document.getElementById('page').contains(document.activeElement)
        && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
      if (page && page.onState && (force || !editing)) page.onState(state, !!force);
    }
  };
  window.App = App;

  function renderStatus() {
    const s = App.state;
    const bar = document.getElementById('statusbar');
    let label, tone;
    if (s.settings.paused) { label = 'Timers pausados'; tone = 'paused'; }
    else if (s.settings.detection === 'always') { label = 'Contando tempo (modo sempre ligado)'; tone = 'on'; }
    else if (!s.detectionSupported) { label = 'Detecção do GTA indisponível neste sistema. Use o modo sempre ligado nas configurações.'; tone = 'paused'; }
    else if (s.gameRunning) { label = 'GTA aberto: contando tempo de produção'; tone = 'on'; }
    else { label = 'GTA fechado: timers parados'; tone = 'off'; }
    bar.replaceChildren(
      h('span', { class: `dot ${tone}` }),
      h('span', { class: 'status-label' }, label),
      h('button', {
        class: s.settings.paused ? 'primary' : '',
        onclick: () => App.act(window.gta.setSettings({ paused: !s.settings.paused }))
      }, s.settings.paused ? 'Retomar' : 'Pausar (estou no modo história ou no menu)')
    );
  }

  function navigate(page) {
    App.page = page;
    for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('active', b.dataset.page === page);
    const root = document.getElementById('page');
    root.replaceChildren();
    App.pages[page].mount(root);
  }

  function tickClock() {
    const clock = document.getElementById('clock');
    const cd = App.state && App.state.cayoCooldownEndsAt;
    clock.textContent = cd ? `Cayo libera em ${GtaProduction.formatMinutes((cd - Date.now()) / 60000)}` : '';
    const page = App.pages[App.page];
    if (page && page.onSecond) page.onSecond();
  }

  async function start() {
    App.data = await window.gta.data();
    App.setState(await window.gta.state());
    window.gta.onState(state => App.setState(state));
    for (const b of document.querySelectorAll('#nav button')) b.addEventListener('click', () => navigate(b.dataset.page));
    navigate('businesses');
    setInterval(tickClock, 1000);
    tickClock();
  }

  start();
})();
