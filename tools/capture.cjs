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
  while (!(win = BrowserWindow.getAllWindows()[0])) await wait(100);
  await new Promise(r => win.webContents.once('did-finish-load', r));
  const errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  await wait(1200);
  for (const page of ['businesses', 'cayo', 'casino', 'payouts', 'settings']) {
    await win.webContents.executeJavaScript(`document.querySelector('[data-page=${page}]').click();
      ${page === 'cayo' ? "for (const [i,v] of [[0,2],[1,3],[3,2]]) { const el=document.querySelectorAll('.stacks input')[i]; el.value=v; el.dispatchEvent(new Event('input')); }" : ''}`);
    await wait(700);
    fs.writeFileSync(path.join(out, `${page}.png`), (await win.webContents.capturePage()).toPNG());
  }
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
