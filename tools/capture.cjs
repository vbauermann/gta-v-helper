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
  cayoCooldownEndsAt: Date.now() + 47 * 60000
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
  for (const page of ['overview', 'businesses', 'cayo', 'casino', 'payouts', 'settings']) {
    await win.webContents.executeJavaScript(`document.querySelector('[data-page=${page}]').click();
      ${page === 'cayo' ? "const rows = document.querySelectorAll('.loot-row'); for (const [r, n] of [[0, 2], [1, 3], [2, 1], [3, 1]]) { const b = rows[r].querySelectorAll('.qty button')[n - 1]; if (!b.classList.contains('active')) b.click(); }" : ''}`);
    await wait(700);
    fs.writeFileSync(path.join(out, `${page}.png`), (await win.webContents.capturePage()).toPNG());
  }
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
    [...document.querySelectorAll('.card.biz[data-id=meth] .chip')].find(b => b.textContent === 'Funcionários').click();
    await new Promise(r => setTimeout(r, 300));
    const s = await window.gta.state();
    return { supply: s.businesses.meth.supplyPct, staff: s.businesses.meth.upgrades.staff,
      status: document.querySelector('.card.biz[data-id=meth] [data-live=status]').textContent };
  })()`);
  if (after.supply < 99.9 || !after.staff) errors.push(`round trip falhou: ${JSON.stringify(after)}`);
  console.log(JSON.stringify({ out, errors, after }));
  app.exit(errors.length ? 1 : 0);
});
