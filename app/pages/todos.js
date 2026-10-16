// "Tarefas" page: the player's daily and weekly checklist. Daily tasks reset at a local hour of
// their choice, weekly ones with GTA Online's Thursday update. Suggestions add with one click; this
// week's bonuses (data/weekly.json) tag the matching tasks and offer week-only extras.
(function () {
  'use strict';
  const { h, icon } = UI;
  const T = GtaTodos;
  const PERIODS = [
    { id: 'daily', title: 'Diárias', icon: 'clock', placeholder: 'Nova tarefa diária' },
    { id: 'weekly', title: 'Semanais', icon: 'calendar', placeholder: 'Nova tarefa semanal' }
  ];
  const resetFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  let root = null;
  let clocks = [];

  const opts = () => ({ dailyHour: App.state.todos.dailyHour, weekly: T.weeklyAnchor(App.data.weekly.resetUtc) });
  const todo = (action, value) => App.act(window.gta.todo(action, value));
  const boosts = () => (App.data.weekly.todo && App.data.weekly.todo.boosts) || {};
  const thisWeek = () => Date.now() < new Date(App.data.weekly.resetUtc).getTime();
  const visible = () => App.state.todos.items.filter(i => !T.isExpired(i, Date.now()));

  function left(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return d ? `${d}d ${hh}h` : hh ? `${hh}h ${mm}min` : `${mm}min`;
  }

  // Note shown under a task: this week's bonus, the rotating target, or the task's own note.
  function details(item) {
    const s = item.key ? T.suggestion(item.key) : null;
    const boost = thisWeek() && item.key ? boosts()[item.key] : null;
    let note = item.note || (s && s.note) || '';
    if (s && s.rotation && thisWeek()) {
      const r = App.data.weekly.rotations.find(x => x.label === s.rotation);
      if (r) note = `Esta semana: ${r.value}`;
    }
    return { boost, note };
  }

  function row(item, now) {
    const done = T.isDone(item, now, opts());
    const { boost, note } = details(item);
    return h('div', { class: `todo-row${done ? ' done' : ''}` },
      h('button', { class: 'todo-check', type: 'button', title: done ? 'Desmarcar' : 'Marcar como feito', onclick: () => todo('toggle', item.id) }, icon('check', 14)),
      h('div', { class: 'grow todo-text', onclick: () => todo('toggle', item.id) },
        h('div', { class: 'todo-title' }, item.title,
          boost ? h('span', { class: 'pill sm ok' }, 'bônus') : null,
          item.expiresAt ? h('span', { class: 'pill sm info' }, 'só esta semana') : null),
        boost || note ? h('div', { class: 'todo-note' }, boost || note) : null),
      h('button', { class: 'icon-btn todo-del', type: 'button', title: 'Tirar da lista', onclick: () => todo('remove', item.id) }, icon('x', 15)));
  }

  function addBox(period) {
    const input = h('input', { class: 'input', type: 'text', maxlength: 80, placeholder: period.placeholder });
    const add = () => {
      const title = input.value.trim();
      if (!title) return input.focus();
      todo('add', { title, period: period.id });
      input.value = '';
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    return h('div', { class: 'todo-add' }, input, h('button', { class: 'btn', type: 'button', onclick: add }, icon('plus', 15), 'Adicionar'));
  }

  function card(period, items, now) {
    const done = items.filter(i => T.isDone(i, now, opts())).length;
    const clock = h('span', { class: 'todo-reset' });
    clocks.push({ el: clock, period: period.id });
    const pct = items.length ? (done / items.length) * 100 : 0;
    return h('div', { class: 'card pad todo-card' },
      h('div', { class: 'card-head' },
        h('h3', null, icon(period.icon, 18), period.title),
        h('span', { class: `pill ${items.length && done === items.length ? 'ok' : ''}` }, `${done} de ${items.length}`)),
      UI.bar(pct, 'var(--ok)', 'todo-bar'),
      clock,
      items.length
        ? h('div', { class: 'todo-list' }, items
          .slice().sort((a, b) => T.isDone(a, now, opts()) - T.isDone(b, now, opts()))
          .map(i => row(i, now)))
        : h('p', { class: 'muted small todo-empty' }, 'Nada aqui ainda. Escreva abaixo ou pegue uma sugestão.'),
      addBox(period));
  }

  function suggestions() {
    const have = new Set(App.state.todos.items.map(i => i.key || i.id));
    const groups = [];
    const extra = thisWeek() && App.data.weekly.todo ? App.data.weekly.todo.extra || [] : [];
    const chip = (s, period, expiresAt, boosted) => have.has(s.key) ? null : h('button', {
      class: `chip todo-chip${boosted ? ' boost' : ''}`, type: 'button', title: s.note || '',
      onclick: () => todo('add', { key: s.key, title: s.title, note: expiresAt ? s.note : '', period, expiresAt })
    }, icon('plus', 13), s.title);
    if (extra.length) groups.push(['Bônus desta semana', extra.map(s => chip(s, 'weekly', new Date(App.data.weekly.resetUtc).getTime(), true))]);
    const order = [['daily', 'Negócios'], ['daily', 'Passivos'], ['daily', 'Coletáveis'], ['weekly', 'Golpes'], ['weekly', 'Semana']];
    for (const [period, group] of order) {
      const label = `${group} · ${period === 'daily' ? 'diária' : 'semanal'}`;
      groups.push([label, T.SUGGESTIONS.filter(s => s.group === group && s.period === period).map(s => chip(s, period, null, thisWeek() && !!boosts()[s.key]))]);
    }
    const shown = groups.map(([label, chips]) => [label, chips.filter(Boolean)]).filter(([, chips]) => chips.length);
    return h('div', { class: 'card pad' },
      h('div', { class: 'card-head' }, h('h3', null, icon('star', 18), 'Sugestões')),
      shown.length
        ? shown.map(([label, chips]) => h('div', { class: 'todo-group' }, h('div', { class: 'todo-group-label' }, label), h('div', { class: 'todo-chips' }, chips)))
        : h('p', { class: 'muted small' }, 'Você já adicionou todas as sugestões.'));
  }

  function render() {
    const now = Date.now();
    const items = visible();
    clocks = [];
    const hour = UI.select(Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')}:00` })),
      String(App.state.todos.dailyHour), { class: 'small', onchange: e => todo('daily-hour', Number(e.target.value)) });
    UI.fill(root,
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Tarefas'),
          h('div', { class: 'sub' }, 'Marque o que já fez. As diárias zeram no horário que você escolher, as semanais junto com a atualização de quinta.')),
        h('label', { class: 'todo-hour' }, h('span', null, 'Diárias zeram às'), hour)),
      h('div', { class: 'grid todo-cols' }, PERIODS.map(p => card(p, items.filter(i => i.period === p.id), now))),
      suggestions());
    onSecond();
  }

  function onSecond() {
    const now = Date.now();
    for (const c of clocks) {
      const at = T.nextReset(c.period, now, opts());
      c.el.textContent = `Zera em ${left(at - now)} (${resetFmt.format(new Date(at))})`;
    }
  }

  // Sidebar badge: tasks still open in the current day/week.
  function pending(state) {
    const now = Date.now();
    const o = { dailyHour: state.todos.dailyHour, weekly: T.weeklyAnchor(App.data.weekly.resetUtc) };
    return state.todos.items.filter(i => !T.isExpired(i, now) && !T.isDone(i, now, o)).length;
  }

  let renderedFor = '';
  window.Pages = window.Pages || {};
  window.Pages.todos = {
    pending,
    mount(el) { root = el; renderedFor = ''; render(); },
    onState(state) {
      if (!root || !root.isConnected) return;
      // Re-render only when the list changed (state arrives every few seconds).
      const sig = JSON.stringify(state.todos);
      if (sig !== renderedFor) { renderedFor = sig; render(); }
    },
    onSecond() {
      if (!root || !root.isConnected) return;
      // A reset happened while the page is open: redraw so checks clear.
      const sig = PERIODS.map(p => T.periodStart(p.id, Date.now(), opts())).join();
      if (sig !== this.periods) { if (this.periods) render(); this.periods = sig; }
      onSecond();
    }
  };
})();
