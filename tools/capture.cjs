// Dev only: opens the app with sample data and saves a screenshot of each page to ./captures.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gta-capture-'));
const file = path.join(dir, 'data.json');
const biz = (supplyPct, stock, upgrades, activeMinutes = 0) => ({ owned: true, upgrades, supplyPct, stock, activeMinutes, calibration: {}, alerts: {} });
const all = { equipment: true, staff: true, security: true };
fs.writeFileSync(file, JSON.stringify({
  settings: { detection: 'always', closeToTray: false },
  businesses: {
    cocaine: biz(100, 3, all, 30),
    bunker: biz(100, 40, all, 135),
    acid: biz(60, 160, { equipment: true }),
    meth: biz(0, 7, { equipment: true })
  },
  cayoCooldownEndsAt: Date.now() + 47 * 60000,
  map: { owned: ['mc-cocaine-2', 'bunker-1', 'garage-1', 'office-4', 'agency-2'] }
}));
process.env.GTA_HELPER_DATA = file;
const out = path.join(__dirname, '../captures');
fs.mkdirSync(out, { recursive: true });

require('../main.cjs');
app.whenReady().then(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let win;
  while (!(win = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'GTA Helper'))) await wait(100);
  await new Promise(r => win.webContents.once('did-finish-load', r));
  const errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  await wait(1200);
  for (const page of ['overview', 'businesses', 'cayo', 'casino', 'kortz', 'cluckin', 'drdre', 'doomsday', 'pacific', 'seriesa', 'humane', 'prison', 'fleeca', 'payouts', 'weekly', 'todos', 'map', 'settings', 'releases']) {
    await win.webContents.executeJavaScript(`document.querySelector('[data-page=${page}]').click();
      ${page === 'cayo' ? "const rows = document.querySelectorAll('.loot-row'); for (const [r, n] of [[0, 2], [1, 3], [2, 1], [3, 1]]) { const b = rows[r].querySelectorAll('.qty button')[n - 1]; if (!b.classList.contains('active')) b.click(); }" : ''}`);
    await wait(700);
    fs.writeFileSync(path.join(out, `${page}.png`), (await win.webContents.capturePage()).toPNG());
  }
  // Acid Lab daily boost.
  await win.webContents.executeJavaScript(`(async () => {
    await App.act(window.gta.setStock('acid', 40));
    await App.act(window.gta.boost('acid', true));
    document.querySelector('[data-page=businesses]').click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('.biz-acid .biz-toggle').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('.biz-acid').scrollIntoView({ block: 'center' });
  })()`);
  await wait(800);
  fs.writeFileSync(path.join(out, 'acid-boost.png'), (await win.webContents.capturePage()).toPNG());
  const boostCheck = await win.webContents.executeJavaScript(`document.querySelector('.biz-acid .boost-line.on') ? document.querySelector('.biz-acid .boost-line').textContent : null`);
  if (!boostCheck || !boostCheck.includes('faltam 80 un.')) errors.push(`boost: ${boostCheck}`);
  // Tasks: check two, add a custom one and a week-only suggestion.
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=todos]').click();`);
  await wait(400);
  await win.webContents.executeJavaScript(`(async () => {
    await window.gta.todo('toggle', 'supply-acid');
    await window.gta.todo('toggle', 'dre');
    const input = document.querySelector('.todo-card .todo-add input');
    input.value = 'Vender o estoque do bunker';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('.todo-chip.boost').click();
  })()`);
  await wait(900);
  fs.writeFileSync(path.join(out, 'todos-marcadas.png'), (await win.webContents.capturePage()).toPNG());
  const todoCheck = await win.webContents.executeJavaScript(`({
    rows: document.querySelectorAll('.todo-row').length, done: document.querySelectorAll('.todo-row.done').length,
    badge: document.querySelector('[data-page=todos] .badge').textContent, boost: document.querySelectorAll('.todo-title .pill.ok').length })`);
  if (todoCheck.rows !== 12 || todoCheck.done !== 2 || todoCheck.badge !== '10' || todoCheck.boost < 1) errors.push(`tarefas: ${JSON.stringify(todoCheck)}`);
  console.log('tarefas', JSON.stringify(todoCheck));
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=cayo]').click(); document.querySelector('.loot-rows').scrollIntoView({ block: 'center' });`);
  await wait(600);
  fs.writeFileSync(path.join(out, 'cayo-alvos.png'), (await win.webContents.capturePage()).toPNG());
  // Cayo map tab.
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=cayo]').click();
    [...document.querySelectorAll('.tabs button')].find(b => b.textContent === 'Mapa').click();`);
  await wait(900);
  fs.writeFileSync(path.join(out, 'cayo-mapa.png'), (await win.webContents.capturePage()).toPNG());
  const mapCheck = await win.webContents.executeJavaScript(`(() => {
    const imgs = [...document.querySelectorAll('.map-viewport.cayo img, .map-filters img')];
    return { pins: document.querySelectorAll('.pin.icon-pin').length, broken: imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src) };
  })()`);
  if (mapCheck.pins !== 73 || mapCheck.broken.length) errors.push(`mapa cayo: ${JSON.stringify(mapCheck)}`);
  // Point popup: mark one guard clothing as found, then open a 2-player locked room.
  await win.webContents.executeJavaScript(`localStorage.removeItem('gta-helper.cayo-map.v2');
    document.querySelector('[data-page=overview]').click(); document.querySelector('[data-page=cayo]').click();
    [...document.querySelectorAll('.tabs button')].find(b => b.textContent === 'Mapa').click();
    const pinOf = src => [...document.querySelectorAll('.pin.icon-pin')].find(p => p.querySelector('img').src.endsWith(src));
    pinOf('clothes.png').click();
    [...document.querySelectorAll('.map-pop button')].find(b => b.textContent === 'Achei!').click();
    pinOf('secondary_locked.png').click();`);
  await wait(900);
  fs.writeFileSync(path.join(out, 'cayo-mapa-ponto.png'), (await win.webContents.capturePage()).toPNG());
  const marked = await win.webContents.executeJavaScript(`[JSON.parse(localStorage.getItem('gta-helper.cayo-map.v2')).found.length,
    document.querySelectorAll('.pin.found').length, [...document.querySelectorAll('.filter-row .count')].map(c => c.textContent).join(' ')]`);
  if (marked[0] !== 1 || marked[1] !== 1 || !marked[2].includes('1/4')) errors.push(`achei: ${JSON.stringify(marked)}`);
  // Zoom in past 2x (swaps the 8192 px image) with every group on.
  await win.webContents.executeJavaScript(`for (const s of document.querySelectorAll('.group-row .switch')) if (!s.checked) s.click();
    const vp = document.querySelector('.map-viewport.cayo'), r = vp.getBoundingClientRect();
    const at = { clientX: r.left + r.width * 0.58, clientY: r.top + r.height * 0.74, deltaY: -100, bubbles: true, cancelable: true };
    for (let i = 0; i < 9; i++) vp.dispatchEvent(new WheelEvent('wheel', at));`);
  await wait(2500);
  const hi = await win.webContents.executeJavaScript(`document.querySelector('.map-viewport.cayo .map img').src`);
  if (!hi.includes('8192')) errors.push(`zoom sem imagem grande: ${hi}`);
  fs.writeFileSync(path.join(out, 'cayo-mapa-zoom.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`localStorage.removeItem('gta-helper.cayo-map.v2')`);
  const found = await win.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('gta-helper.cayo')).found`);
  if (found.gold !== 2 || found.cocaine !== 3) errors.push(`cayo pilhas: ${JSON.stringify(found)}`);
  // Los Santos map: garage name on hover, "Tenho este" links the business, animals, only mine.
  await win.webContents.executeJavaScript(`localStorage.removeItem('gta-helper.ls-map.v1');
    document.querySelector('[data-page=overview]').click(); document.querySelector('[data-page=map]').click();`);
  await wait(1500);
  const pin = label => `[...document.querySelectorAll('.map-viewport.ls .pin')].find(p => p.getAttribute('aria-label') === ${JSON.stringify(label)})`;
  const lsCheck = await win.webContents.executeJavaScript(`(() => {
    const p = ${pin('Unit 2 Popular St')};
    p.dispatchEvent(new MouseEvent('mouseenter'));
    const broken = [...document.querySelectorAll('.map-viewport.ls img, .map-filters img')].filter(i => i.complete && !i.naturalWidth).map(i => i.src);
    return { pins: document.querySelectorAll('.map-viewport.ls .pin').length, owned: document.querySelectorAll('.map-viewport.ls .pin.owned').length,
      tip: document.querySelector('.map-tip').textContent, broken };
  })()`);
  if (lsCheck.owned !== 5 || !lsCheck.tip.startsWith('Unit 2 Popular St') || lsCheck.broken.length || lsCheck.pins < 150) errors.push(`mapa ls: ${JSON.stringify(lsCheck)}`);
  fs.writeFileSync(path.join(out, 'mapa-garagem.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`${pin('El Burro Heights')}.click()`);
  await wait(300);
  fs.writeFileSync(path.join(out, 'mapa-ponto.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('.map-pop button')].find(b => b.textContent === 'Tenho este').click()`);
  await wait(500);
  const own = await win.webContents.executeJavaScript(`[App.state.businesses.meth.owned, App.state.map.owned.includes('mc-meth-2'), document.querySelectorAll('.map-viewport.ls .pin.owned').length]`);
  if (!own[0] || !own[1] || own[2] !== 6) errors.push(`mapa tenho este: ${JSON.stringify(own)}`);
  await win.webContents.executeJavaScript(`(() => {
    const g = [...document.querySelectorAll('.filter-group')].find(e => e.textContent.includes('Animais'));
    g.querySelector('.group-row .switch').click();
    const row = () => [...document.querySelectorAll('.filter-row')].find(e => e.textContent.startsWith('Cervo'));
    row().querySelector('.check').click();
    document.querySelector('.zoom-tools .reset').click();
  })()`);
  await wait(600);
  fs.writeFileSync(path.join(out, 'mapa-animais.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('.mine-row .switch').click()`);
  await wait(400);
  fs.writeFileSync(path.join(out, 'mapa-meus.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`localStorage.removeItem('gta-helper.ls-map.v1')`);
  // Casino fingerprint tab and the overlay window itself (all four, then one in move mode).
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=casino]').click();
    [...document.querySelectorAll('.tabs button')].find(b => b.textContent === 'Digitais').click();`);
  await wait(700);
  fs.writeFileSync(path.join(out, 'casino-digitais.png'), (await win.webContents.capturePage()).toPNG());
  // Scanner: feed hack-1 (right tiles 0, 1, 3 and 4) instead of the real screen. 
  process.env.GTA_HELPER_FAKE_SCREEN = path.join(__dirname, '../test/fixtures/hack-1.pgm.gz');
  await wait(2500);
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=casino]').click(); [...document.querySelectorAll('.tabs button')].find(b => b.textContent === 'Digitais').click();`);
  await wait(800);
  fs.writeFileSync(path.join(out, 'casino-digitais-auto.png'), (await win.webContents.capturePage()).toPNG());
  const marker = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'GTA Helper marcador');
  const scan = await win.webContents.executeJavaScript('App.state.scanner');
  if (!marker || !marker.isVisible()) errors.push('marcador não apareceu');
  else {
    const boxes = await marker.webContents.executeJavaScript(`[...document.querySelectorAll('.box')].map(b => [b.style.left, b.style.top, b.style.width])`);
    fs.writeFileSync(path.join(out, 'marker-boxes.json'), JSON.stringify({ bounds: marker.getBounds(), boxes, scan }));
    if (boxes.length !== 4) errors.push(`marcador com ${boxes.length} bordas`);
  }
  if (!scan || scan.state !== 'found' || scan.picks.join() !== '0,1,3,4') errors.push(`scanner: ${JSON.stringify(scan)}`);
  const badgeText = async () => {
    const b = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'GTA Helper detecção');
    return b && b.isVisible() ? b.webContents.executeJavaScript(`document.getElementById('text').textContent`) : null;
  };
  const onText = await badgeText();
  if (onText !== 'Detecção de digitais') errors.push(`aviso: ${onText}`);
  const badgeWin = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'GTA Helper detecção');
  if (badgeWin) fs.writeFileSync(path.join(out, 'aviso-deteccao.png'), (await badgeWin.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`window.gta.overlay('configure', { auto: false })`);
  await wait(800);
  if (await badgeText()) errors.push('aviso continuou com a detecção desligada');
  if (marker && marker.isVisible()) errors.push('marcador continuou com a marcação desligada');
  await win.webContents.executeJavaScript(`window.gta.overlay('configure', { auto: true })`);
  delete process.env.GTA_HELPER_FAKE_SCREEN; // back to "GTA fechado": the marker hides
  await wait(2500);
  if (marker && marker.isVisible()) errors.push('marcador não sumiu');
  await win.webContents.executeJavaScript(`window.gta.overlay('show').then(s => App.setState(s, true))`);
  await wait(1200);
  const ovWin = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'GTA Helper overlay');
  if (!ovWin || !ovWin.isVisible()) errors.push('overlay não apareceu');
  else {
    fs.writeFileSync(path.join(out, 'overlay-todas.png'), (await ovWin.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`window.gta.overlay('print', 'J').then(() => window.gta.overlay('interact', true)).then(s => App.setState(s, true))`);
    await wait(900);
    fs.writeFileSync(path.join(out, 'overlay-j-mover.png'), (await ovWin.webContents.capturePage()).toPNG());
    const st = await win.webContents.executeJavaScript('window.gta.state().then(s => s.overlay)');
    if (st.print !== 'J' || !st.interact || !st.visible) errors.push(`overlay estado: ${JSON.stringify(st)}`);
    await win.webContents.executeJavaScript(`window.gta.overlay('interact', false).then(() => window.gta.overlay('hide'))`);
  }
  // Heist wiki: Casino setups filtered by approach, one setup page marked as done, the finale.
  const tabOf = label => `[...document.querySelectorAll('.tabs button')].find(b => b.textContent === '${label}').click();`;
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=casino]').click(); ${tabOf('Setups')}
    [...document.querySelectorAll('.wiki-filter button')].find(b => b.textContent === 'The Big Con').click();`);
  await wait(600);
  fs.writeFileSync(path.join(out, 'wiki-setups.png'), (await win.webContents.capturePage()).toPNG());
  const wikiCheck = await win.webContents.executeJavaScript(`(async () => {
    const rows = document.querySelectorAll('.wiki-step').length;
    document.querySelectorAll('.wiki-step')[0].click();
    await new Promise(r => setTimeout(r, 200));
    const title = document.querySelector('.wiki-title').textContent;
    [...document.querySelectorAll('.wiki button')].find(b => b.textContent.includes('Marcar como feito')).click();
    await new Promise(r => setTimeout(r, 400));
    const s = await window.gta.state();
    return { rows, title, done: (s.heistProgress.casino || []).length, button: [...document.querySelectorAll('.wiki button')].some(b => b.textContent.includes('Feito')) };
  })()`);
  await wait(400);
  fs.writeFileSync(path.join(out, 'wiki-setup.png'), (await win.webContents.capturePage()).toPNG());
  if (wikiCheck.rows < 5 || wikiCheck.done !== 1 || !wikiCheck.button) errors.push(`wiki: ${JSON.stringify(wikiCheck)}`);
  console.log('wiki', JSON.stringify(wikiCheck));
  await win.webContents.executeJavaScript(`${tabOf('Final')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-final.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=doomsday]').click(); ${tabOf('Setups')}
    [...document.querySelectorAll('.wiki-filter button')][1].click();`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-doomsday-setups.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=kortz]').click(); ${tabOf('Setups')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-kortz-setups.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=drdre]').click(); ${tabOf('Setups')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-drdre-setups.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=cluckin]').click(); ${tabOf('Final')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-cluckin-final.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=pacific]').click(); ${tabOf('Final')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-pacific-final.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=fleeca]').click(); ${tabOf('Setups')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-fleeca-setups.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=cayo]').click(); ${tabOf('Setups')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-cayo-setups.png'), (await win.webContents.capturePage()).toPNG());
  const cayoSections = await win.webContents.executeJavaScript(`[...document.querySelectorAll('.wiki-section-head h4')].map(e => e.textContent)`);
  if (cayoSections.length !== 5) errors.push(`seções do cayo: ${JSON.stringify(cayoSections)}`);
  await win.webContents.executeJavaScript(`document.querySelector('[data-page=cayo]').click(); ${tabOf('Visão geral')}`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'wiki-cayo.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`${tabOf('Calculadora')} document.querySelector('[data-page=casino]').click(); ${tabOf('Calculadora')}`);
  // Light theme check, then back to dark.
  await win.webContents.executeJavaScript(`window.gta.setSettings({ theme: 'light' }).then(s => App.setState(s, true)); document.querySelector('[data-page=overview]').click();`);
  await wait(900);
  fs.writeFileSync(path.join(out, 'overview-light.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`window.gta.setSettings({ theme: 'dark' }).then(s => App.setState(s, true))`);
  // Exercise the IPC round trip: resupply meth, toggle its staff upgrade, then read state back.
  const after = await win.webContents.executeJavaScript(`(async () => {
    document.querySelector('[data-page=businesses]').click();
    await new Promise(r => setTimeout(r, 300));
    const card = document.querySelector('.card.biz[data-id=meth]');
    card.querySelector('button.primary').click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('.card.biz[data-id=meth] .biz-toggle').click();
    await new Promise(r => setTimeout(r, 200));
    [...document.querySelectorAll('.card.biz[data-id=meth] .chip')].find(b => b.textContent === 'Funcionários').click();
    await new Promise(r => setTimeout(r, 300));
    const s = await window.gta.state();
    return { delivery: s.businesses.meth.delivery && s.businesses.meth.delivery.at, staff: s.businesses.meth.upgrades.staff,
      status: document.querySelector('.card.biz[data-id=meth] [data-live=status]').textContent };
  })()`);
  await win.webContents.executeJavaScript(`document.querySelector('.card.biz[data-id=meth]').scrollIntoView({ block: 'center' })`);
  await wait(500);
  fs.writeFileSync(path.join(out, 'businesses-delivery.png'), (await win.webContents.capturePage()).toPNG());
  if (!(after.delivery > 9) || !after.staff || !after.status.startsWith('Suprimentos chegando')) errors.push(`round trip falhou: ${JSON.stringify(after)}`);
  console.log(JSON.stringify({ out, errors, after }));
  app.exit(errors.length ? 1 : 0);
});
