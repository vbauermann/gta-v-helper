// "Novidades" page: what changed in each version, from data/release-notes.json (kept up to date on
// every release, see docs/adr/0013). The sidebar shows "novo" after an update until the page is seen.
(function () {
  'use strict';
  const { h, icon } = UI;
  const SEEN_KEY = 'gta-helper.seen-version';
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  function seen() {
    try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
  }

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, App.data.version); } catch { /* storage off: badge just stays */ }
  }

  function render(root) {
    const current = App.data.version;
    UI.fill(root,
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Novidades'),
          h('div', { class: 'sub' }, `O que mudou em cada versão. Você está na ${current}.`))),
      h('div', { class: 'release-list' }, App.data.releaseNotes.map(r =>
        h('article', { class: `card pad release${r.version === current ? ' current' : ''}` },
          h('div', { class: 'card-head' },
            h('h3', null, icon('notes', 18), `Versão ${r.version}`),
            r.version === current ? h('span', { class: 'pill sm ok' }, 'sua versão') : null,
            h('span', { class: 'grow' }),
            h('span', { class: 'muted small' }, dateFmt.format(new Date(`${r.date}T12:00:00Z`)))),
          h('div', { class: 'release-title' }, r.title),
          h('ul', { class: 'release-items' }, r.items.map(t => h('li', null, t)))))));
  }

  window.Pages = window.Pages || {};
  window.Pages.releases = {
    mount(el) { markSeen(); render(el); },
    // Sidebar badge: "novo" while this version's notes were not opened yet.
    badge() {
      const el = document.querySelector('[data-page=releases] .badge');
      if (!el || !App.data) return;
      el.textContent = seen() !== App.data.version && App.page !== 'releases' ? 'novo' : '';
    }
  };
})();
