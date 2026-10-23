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
          checkbox('Aviso na tela', s.notify, e => set({ notify: e.target.checked }), 'Mostra cada aviso no canto de cima da tela, por cima do jogo, por 10 segundos. Eles sempre ficam também no sino e no menu Avisos.'),
          setting('Testar', 'Manda um aviso de teste agora.',
            h('button', { class: 'btn sm', type: 'button', onclick: () => App.act(window.gta.notices('test')) }, icon('bell', 15), 'Enviar teste')),
          checkbox('Fechar mantém na bandeja', s.closeToTray, e => set({ closeToTray: e.target.checked }), 'Os timers continuam com a janela fechada.')),
        screenSection(s, set),
        remindersSection(),
        updateSection(),
        section('palette', 'Aparência',
          setting('Tema', null, segmented([{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }], s.theme || 'dark', v => set({ theme: v })))),
        section('info', 'Sobre os números',
          App.data.catalog.notes.map(n => h('p', { class: 'muted small note' }, n)))));
  }

  // Screen reader of the Terrorbyte (Master Control Terminal) and the Nightclub computer.
  function screenSection(s, set) {
    const b = App.state.bizScanner || { state: 'off' };
    const on = s.screenRead !== false;
    const time = b.at ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(b.at) : null;
    const now = !on ? 'Desligada.'
      : b.state === 'error' ? `Erro na captura: ${b.error || 'desconhecido'}`
        : b.state === 'off' ? 'Esperando o GTA abrir.'
          : b.screen === 'mct' ? 'Lendo o Master Control Terminal agora.'
            : b.screen === 'nightclub' ? 'Lendo o computador do Nightclub agora.'
              : 'Olhando a tela.';
    return section('eye', 'Leitura da tela',
      checkbox('Ler as telas dos negócios', on, e => set({ screenRead: e.target.checked }),
        'Abra o Master Control Terminal no Terrorbyte, ou Sell Goods no computador do Nightclub, e o app atualiza estoque e suprimentos sozinho. Ele só captura a tela, como o OBS: não lê nem mexe no jogo.'),
      setting('Situação', time ? `Última leitura às ${time}.` : 'Nenhuma leitura ainda.', h('span', { class: 'muted small' }, now)));
  }

  // Periodic reminders ("Conferir o Terrorbyte a cada 2h"). In-game ones count only while the timers count.
  function remindersSection() {
    const N = GtaNotices;
    const list = App.state.notices.reminders;
    const notices = (action, value) => App.act(window.gta.notices(action, value));
    const intervals = every => {
      const opts = N.INTERVALS.includes(every) ? N.INTERVALS : [...N.INTERVALS, every].sort((a, b) => a - b);
      return opts.map(m => ({ value: String(m), label: `a cada ${N.formatEvery(m)}` }));
    };
    const rows = list.map(r => h('div', { class: `reminder-row${r.enabled ? '' : ' off'}` },
      h('input', { type: 'checkbox', class: 'switch', checked: r.enabled, title: r.enabled ? 'Desligar' : 'Ligar', onchange: e => notices('reminder-update', { id: r.id, enabled: e.target.checked }) }),
      h('input', { class: 'input grow', type: 'text', maxlength: 80, value: r.title, 'aria-label': 'Nome do lembrete',
        onchange: e => e.target.value.trim() ? notices('reminder-update', { id: r.id, title: e.target.value }) : (e.target.value = r.title) }),
      select(intervals(r.every), String(r.every), { class: 'small', onchange: e => notices('reminder-update', { id: r.id, every: Number(e.target.value) }) }),
      h('label', { class: 'reminder-game', title: 'Só conta o tempo com o GTA aberto e os timers rodando' },
        h('input', { type: 'checkbox', checked: r.inGame, onchange: e => notices('reminder-update', { id: r.id, inGame: e.target.checked }) }), 'só com o GTA aberto'),
      h('button', { class: 'btn ghost icon sm', type: 'button', title: 'Apagar lembrete', onclick: () => notices('reminder-remove', { id: r.id }) }, icon('x', 15))));
    const title = h('input', { class: 'input grow', type: 'text', maxlength: 80, placeholder: 'Novo lembrete, ex.: Conferir o Terrorbyte' });
    const every = select(intervals(120), '120', { class: 'small' });
    const add = () => {
      if (!title.value.trim()) return title.focus();
      notices('reminder-add', { title: title.value, every: Number(every.value) });
    };
    title.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    const have = new Set(list.map(r => r.title.toLowerCase()));
    const chips = N.SUGGESTIONS.filter(x => !have.has(x.title.toLowerCase()));
    return h('div', { class: 'card pad settings-card reminders-card' },
      h('div', { class: 'card-head' }, h('h3', null, icon('clock', 18), 'Lembretes')),
      h('p', { class: 'muted small' }, 'Avisos que se repetem de tempo em tempo. Aparecem no sino, no menu Avisos e na tela.'),
      rows.length ? h('div', { class: 'reminder-list' }, rows) : null,
      h('div', { class: 'reminder-add' }, title, every,
        h('button', { class: 'btn primary sm', type: 'button', onclick: add }, icon('plus', 15), 'Adicionar')),
      chips.length ? h('div', { class: 'reminder-chips' },
        h('span', { class: 'upgrades-label' }, 'Sugestões'),
        chips.map(x => h('button', { class: 'chip', type: 'button', onclick: () => notices('reminder-add', x) }, `${x.title} · ${N.formatEvery(x.every)}`))) : null);
  }

  function updateSection() {
    const u = App.state.updater || { state: 'off' };
    const text = {
      off: 'Atualização automática só funciona na versão instalada.',
      checking: 'Procurando versão nova…',
      latest: 'Você está na versão mais recente.',
      downloading: `Baixando a versão ${u.version || ''} (${u.percent || 0}%).`,
      ready: `A versão ${u.version} está pronta. Reinicie o app para usar.`,
      error: `Não deu pra procurar agora: ${u.error || 'erro desconhecido'}`
    }[u.state] || '';
    const action = u.state === 'ready'
      ? h('button', { class: 'btn primary', type: 'button', onclick: () => App.act(window.gta.update('install')) }, 'Reiniciar e atualizar')
      : h('button', { class: 'btn', type: 'button', disabled: u.state === 'off' || u.state === 'checking' || u.state === 'downloading', onclick: () => App.act(window.gta.update('check')) }, 'Procurar agora');
    return section('download', 'Atualizações', setting(`Versão ${u.current || ''}`.trim(), text, action));
  }

  window.Pages = window.Pages || {};
  window.Pages.settings = {
    mount(el) { root = el; render(); },
    onState(s, force) {
      const sig = JSON.stringify([s.updater, s.bizScanner]);
      if (root && root.isConnected && (force || sig !== this.updSig)) render();
      this.updSig = sig;
    }
  };
})();
