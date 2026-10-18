(function () {
  'use strict';
  const { h, icon } = UI;
  const P = GtaProduction;

  const App = {
    data: null,
    state: null,
    receivedAt: 0,
    page: 'overview',
    pages: window.Pages || {},
    // Online minutes elapsed since the main process last ticked, for smooth second-by-second countdowns.
    extraMinutes() {
      if (!this.state || !this.state.counting) return 0;
      return Math.max(0, (Date.now() - this.receivedAt) / 60000);
    },
    // Current projection and urgency of one owned business, shared by every page and the sidebar badge.
    business(def) {
      const biz = this.state.businesses[def.id];
      const p = P.project(def, biz, biz.activeMinutes + (biz.owned ? this.extraMinutes() : 0));
      let tone = 'ok';
      let text;
      if (!p.producing) tone = 'stopped';
      else if (p.minutesToStop <= this.state.settings.warnMinutes) tone = 'warning';
      if (p.deliveryIn) {
        if (!p.producing) tone = 'warning';
        text = `Suprimentos chegando em ${P.formatMinutes(p.deliveryIn)}${p.producing ? '' : ' (parado até lá)'}`;
      } else if (p.producing) {
        text = p.stopsOn === 'supply'
          ? `Suprimento acaba em ${P.formatMinutes(p.minutesToSupplyEmpty)}`
          : `Estoque enche em ${P.formatMinutes(p.minutesToFull)}`;
      } else {
        text = p.stock >= def.capacity - 1e-9 ? 'Parado: estoque cheio, hora de vender' : 'Parado: sem suprimentos';
      }
      const pill = p.deliveryIn && !p.producing ? 'Aguardando' : { ok: 'Produzindo', warning: 'Acabando', stopped: 'Parado' }[tone];
      return { biz, p, tone, text, pill };
    },
    owned() {
      return this.data.catalog.businesses.filter(d => this.state.businesses[d.id].owned);
    },
    gameStatus() {
      const s = this.state;
      if (s.settings.paused) return { tone: 'warn', title: 'Timers pausados', sub: 'Clique pra retomar a contagem' };
      if (s.settings.detection === 'always') return { tone: 'ok', title: 'Contando tempo', sub: 'Modo sempre ligado · clique pra pausar' };
      if (!s.detectionSupported) return { tone: '', title: 'Detecção indisponível', sub: 'Só funciona no Windows' };
      if (s.gameRunning) return { tone: 'ok', title: 'Contando tempo', sub: 'GTA aberto · clique pra pausar' };
      return { tone: '', title: 'Timers parados', sub: 'Esperando o GTA abrir' };
    },
    async act(promise) {
      try {
        this.setState(await promise, true);
      } catch (error) {
        console.error(error);
        toast('Não deu certo', String(error.message || error).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, ''));
      }
    },
    navigate(page) { navigate(page); },
    setState(state, force) {
      this.state = state;
      this.receivedAt = Date.now();
      document.documentElement.dataset.theme = state.settings.theme || 'dark';
      renderChrome();
      const page = this.pages[this.page];
      const editing = document.activeElement && document.getElementById('page').contains(document.activeElement)
        && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
      if (page && page.onState && (force || !editing)) page.onState(state, !!force);
    }
  };
  window.App = App;

  function toast(title, text) {
    const el = h('div', { class: 'toast danger' }, icon('alert', 18), h('div', null, h('div', { class: 't-title' }, title), h('div', { class: 't-text' }, text)));
    document.getElementById('toasts').append(el);
    setTimeout(() => el.remove(), 5000);
  }

  // Title bar pill, sidebar badges and the watch card. Runs on every state and every second.
  function renderChrome() {
    if (!App.state || !App.data) return;
    const g = App.gameStatus();
    const s = App.state;
    const pill = document.getElementById('game-pill');
    pill.className = `game-pill ${s.gameRunning ? 'on' : ''}`;
    pill.replaceChildren(icon('gamepad', 15), s.gameRunning ? 'GTA aberto' : 'GTA fechado');

    const watch = document.getElementById('watch');
    watch.replaceChildren(
      h('div', { class: 'row' }, h('span', { class: `dot ${g.tone === 'ok' ? 'on' : g.tone}` }), g.title),
      h('div', { class: 'sub' }, g.sub));
    watch.title = s.settings.paused ? 'Retomar timers' : 'Pausar timers (modo história, menu, loading)';

    const attention = App.owned().filter(d => App.business(d).tone !== 'ok').length;
    document.querySelector('[data-page=businesses] .badge').textContent = attention ? String(attention) : '';
    App.pages.releases.badge();
    const open = App.pages.todos.pending(s);
    document.querySelector('[data-page=todos] .badge').textContent = open ? String(open) : '';
    renderUpdate(s.updater);
    const cd = s.cayoCooldownEndsAt;
    document.querySelector('[data-page=cayo] .badge').textContent = cd && cd > Date.now() ? P.formatMinutes((cd - Date.now()) / 60000) : '';
  }

  // Sidebar card once a new version has been downloaded.
  let updateShown = '';
  function renderUpdate(u) {
    const box = document.getElementById('update');
    const key = u && u.state === 'ready' ? u.version : '';
    if (key === updateShown) return;
    updateShown = key;
    box.hidden = !key;
    if (!key) return box.replaceChildren();
    box.replaceChildren(
      h('div', { class: 'row' }, icon('star', 15), `Versão ${u.version} pronta`),
      h('button', { class: 'btn primary', type: 'button', onclick: () => App.act(window.gta.update('install')) }, 'Reiniciar e atualizar'));
  }

  function navigate(page) {
    App.page = page;
    for (const b of document.querySelectorAll('#nav .nav-item')) b.classList.toggle('active', b.dataset.page === page);
    const root = document.getElementById('page');
    root.replaceChildren();
    // Restart the page fade like Nexo does on route change.
    root.style.animation = 'none';
    void root.offsetWidth;
    root.style.animation = '';
    document.getElementById('main').scrollTop = 0;
    App.pages[page].mount(root);
  }

  function tick() {
    renderChrome();
    const page = App.pages[App.page];
    if (page && page.onSecond) page.onSecond();
  }

  async function start() {
    document.getElementById('brand').prepend(icon('logo', 20));
    for (const b of document.querySelectorAll('#nav .nav-item')) {
      b.prepend(icon(b.dataset.icon, 18));
      b.addEventListener('click', () => navigate(b.dataset.page));
    }
    document.getElementById('watch').addEventListener('click', () =>
      App.act(window.gta.setSettings({ paused: !App.state.settings.paused })));
    App.data = await window.gta.data();
    App.setState(await window.gta.state());
    window.gta.onState(state => App.setState(state));
    // A new week arrived from GitHub: redraw the pages that show it.
    window.gta.onWeekly(weekly => {
      App.data.weekly = weekly;
      if (App.page === 'weekly' || App.page === 'todos') navigate(App.page);
    });
    window.gta.onWiki(wiki => {
      App.data.wiki = wiki;
      if (['casino', 'cayo', ...window.HeistPages].includes(App.page)) navigate(App.page);
    });
    navigate('overview');
    setInterval(tick, 1000);
  }

  start();
})();
