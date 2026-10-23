// "Avisos" page and the bell in the title bar: every notice the app sent (newest first), unread
// ones highlighted, plus the active reminders. Reminders are configured in Ajustes.
(function () {
  'use strict';
  const { h, icon } = UI;
  const N = GtaNotices;
  const P = GtaProduction;
  const KIND = GtaNotices.STYLE;
  const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  let root = null;

  const items = () => App.state.notices.items;
  const unread = () => N.unread(items());
  const notices = (action, value) => window.gta.notices(action, value);
  // Marks everything read without rebuilding the open page, so the highlight stays until it is left.
  const markRead = () => { if (unread()) notices('read-all').then(s => App.setState(s, false)); };

  function ago(at) {
    const min = Math.round((Date.now() - at) / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    const day = dayLabel(at);
    return day === 'Hoje' ? timeFmt.format(at) : `${day === 'Ontem' ? 'ontem' : shortFmt.format(at)} ${timeFmt.format(at)}`;
  }

  function dayLabel(at) {
    const d = new Date(at), today = new Date();
    const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(today) - start(d)) / 86400000);
    return diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : dayFmt.format(d);
  }

  function row(n) {
    const k = KIND[n.kind] || KIND.reminder;
    return h('button', {
      class: `notice-row${n.read ? '' : ' unread'}${n.page ? ' link' : ''}`, type: 'button',
      title: n.page ? 'Abrir' : '',
      onclick: () => { closeBell(); if (n.page) App.navigate(n.page); }
    },
      h('span', { class: `notice-icon ${k.tone}` }, icon(k.icon, 16)),
      h('span', { class: 'grow notice-text' },
        h('span', { class: 'notice-title' }, n.title),
        n.body ? h('span', { class: 'notice-body' }, n.body) : null),
      h('span', { class: 'notice-time', dataset: { at: String(n.at) } }, ago(n.at)),
      n.read ? null : h('span', { class: 'notice-dot', title: 'Não lido' }));
  }

  function remindersCard() {
    const list = App.state.notices.reminders;
    const on = list.filter(r => r.enabled);
    return h('div', { class: 'card pad notice-reminders' },
      h('div', { class: 'card-head' },
        h('h3', null, icon('clock', 18), 'Lembretes'),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => App.navigate('settings') }, icon('settings', 15), 'Configurar')),
      on.length
        ? on.map(r => h('div', { class: 'reminder-line' },
          h('span', { class: 'grow' }, r.title),
          h('span', { class: 'muted small' }, `a cada ${N.formatEvery(r.every)}${r.inGame ? ' de jogo' : ''} · próximo em ${P.formatMinutes(N.minutesLeft(r))}`)))
        : h('p', { class: 'muted small' }, 'Nenhum lembrete ligado. Crie um nos Ajustes, como "Conferir o Terrorbyte a cada 2h".'));
  }

  function render() {
    if (!root) return;
    const list = items();
    const groups = [];
    for (const n of list) {
      const label = dayLabel(n.at);
      let g = groups[groups.length - 1];
      if (!g || g.label !== label) groups.push(g = { label, items: [] });
      g.items.push(n);
    }
    const count = unread();
    UI.fill(root,
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Avisos'),
          h('div', { class: 'sub' }, count ? `${count} não ${count === 1 ? 'lido' : 'lidos'}. Tudo que o app te avisou fica aqui, além do aviso na tela.` : 'Tudo que o app te avisou fica aqui, além do aviso na tela.')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost sm', type: 'button', disabled: !list.length, onclick: () => App.act(notices('clear')) }, icon('eraser', 15), 'Limpar lista'))),
      remindersCard(),
      list.length
        ? groups.map(g => h('div', { class: 'card notice-group' },
          h('div', { class: 'notice-day' }, g.label),
          g.items.map(row)))
        : h('div', { class: 'card pad empty-notices' }, icon('bell', 22),
          h('div', null, h('div', { class: 'tile-title' }, 'Nenhum aviso ainda'),
            h('div', { class: 'muted small' }, 'Negócio parando, estoque cheio, Cayo liberado, semana nova e os seus lembretes aparecem aqui.'))));
    markRead();
  }

  // ---------- bell (title bar) ----------
  let popOpen = false;
  function renderBell() {
    const btn = document.getElementById('bell');
    const count = unread();
    const sig = `${count}|${popOpen}`;
    if (btn.dataset.sig === sig) return;
    btn.dataset.sig = sig;
    btn.classList.toggle('open', popOpen);
    btn.replaceChildren(...[icon('bell', 17), count ? h('span', { class: 'bell-count' }, count > 99 ? '99+' : String(count)) : null].filter(Boolean));
    btn.title = count ? `Avisos (${count} não ${count === 1 ? 'lido' : 'lidos'})` : 'Avisos';
    document.querySelector('[data-page=notices] .badge').textContent = count ? String(count) : '';
  }

  function openBell() {
    const pop = document.getElementById('bell-pop');
    const list = items().slice(0, 6);
    pop.replaceChildren(
      h('div', { class: 'bell-head' }, h('b', null, 'Avisos'),
        unread() ? h('span', { class: 'muted small' }, `${unread()} não ${unread() === 1 ? 'lido' : 'lidos'}`) : null),
      list.length ? h('div', { class: 'bell-list' }, list.map(row)) : h('div', { class: 'bell-empty muted small' }, 'Nenhum aviso ainda.'),
      h('button', { class: 'bell-all', type: 'button', onclick: () => { closeBell(); App.navigate('notices'); } }, 'Ver todos os avisos', icon('chevron', 14)));
    pop.hidden = false;
    popOpen = true;
    renderBell();
    markRead();
  }

  function closeBell() {
    const pop = document.getElementById('bell-pop');
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    popOpen = false;
    renderBell();
  }

  function setupBell() {
    document.getElementById('bell').addEventListener('click', e => {
      e.stopPropagation();
      if (popOpen) closeBell(); else openBell();
    });
    document.getElementById('bell-pop').addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', closeBell);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBell(); });
  }

  window.Pages = window.Pages || {};
  window.Pages.notices = {
    mount(el) { root = el; render(); },
    onState(s, force) {
      const sig = `${s.notices.items.length}|${s.notices.items[0] ? s.notices.items[0].id : ''}|${s.notices.reminders.map(r => `${r.id}:${r.enabled}:${Math.ceil(N.minutesLeft(r))}`).join()}`;
      if (root && root.isConnected && (force || sig !== this.sig)) render();
      this.sig = sig;
    },
    onSecond() {
      if (!root || !root.isConnected) return;
      for (const t of root.querySelectorAll('.notice-time[data-at]')) t.textContent = ago(Number(t.dataset.at));
    },
    renderBell,
    setupBell,
    closeBell
  };
})();
