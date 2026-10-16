const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, session, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./store.cjs');
const { advance } = require('./timers.cjs');
const { createGameWatcher } = require('./game-watcher.cjs');
const { createOverlay } = require('./overlay.cjs');
const { createScanner } = require('./fp-scanner.cjs');

const TICK_MS = 5000;
// Window controls drawn by Windows over the 44px title bar, matching Nexo's colours per theme.
const OVERLAY = {
  dark: { color: '#0d0f15', symbolColor: '#c6c9d4', height: 44 },
  light: { color: '#eef0f5', symbolColor: '#3b3f4c', height: 44 }
};
const MAX_TICK_MINUTES = 0.5; // A sleeping PC must not count as hours of production.

app.setName('GTA Helper');
app.setAppUserModelId('local.gtahelper');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/businesses.json'), 'utf8'));
const heists = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/heists.json'), 'utf8'));
heists.cayo.map = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/cayo-map.json'), 'utf8'));
const dataFile = process.env.GTA_HELPER_DATA || path.join(app.getPath('userData'), 'gta-helper.json');

let mainWindow = null;
let tray = null;
let quitting = false;
let store;
let watcher;
let overlay = null;
let scanner = null;
let lastTick = Date.now();
let dirty = false;

function isCounting() {
  const s = store.get().settings;
  if (s.paused) return false;
  if (s.detection === 'always') return true;
  return watcher.isRunning();
}

function snapshot() {
  return {
    ...store.get(),
    tickAt: lastTick,
    counting: isCounting(),
    gameRunning: watcher.isRunning(),
    detectionSupported: watcher.supported,
    overlay: overlay ? overlay.state() : null,
    scanner: scanner ? scanner.state() : null
  };
}

function broadcast() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('gta:state', snapshot());
}

function tick() {
  const now = Date.now();
  const delta = Math.min((now - lastTick) / 60000, MAX_TICK_MINUTES);
  const counting = isCounting();
  lastTick = now;
  if (counting && delta > 0) {
    const alerts = advance(store.get(), catalog, delta);
    dirty = true;
    if (store.get().settings.notify && Notification.isSupported()) {
      for (const a of alerts) new Notification({ title: a.title, body: a.body, silent: false }).show();
    }
  }
  const cd = store.get().cayoCooldownEndsAt;
  if (cd && now >= cd) {
    store.get().cayoCooldownEndsAt = null;
    dirty = true;
    if (store.get().settings.notify && Notification.isSupported()) {
      new Notification({ title: 'Cayo Perico liberado', body: 'O cooldown do golpe terminou.' }).show();
    }
  }
  broadcast();
}

function persist() {
  if (!dirty) return;
  dirty = false;
  try { store.save(); } catch (error) { console.error('Falha ao salvar:', error); dirty = true; }
}

function mutate(fn) {
  tick(); // Fold production up to now before applying the change.
  fn(store.get());
  dirty = true;
  persist();
  broadcast();
  return snapshot();
}

const num = (v, lo, hi) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new TypeError('número inválido');
  return Math.min(hi, Math.max(lo, n));
};

function business(id) {
  const def = catalog.businesses.find(b => b.id === id);
  if (!def) throw new TypeError('negócio desconhecido');
  return def;
}

function registerIpc() {
  ipcMain.handle('gta:data', () => ({ catalog, heists }));
  ipcMain.handle('gta:state', () => snapshot());

  ipcMain.handle('gta:set-owned', (_e, id, owned) => mutate(s => {
    business(id);
    store.rebase(id);
    s.businesses[id].owned = !!owned;
  }));

  ipcMain.handle('gta:set-upgrades', (_e, id, upgrades) => mutate(s => {
    const def = business(id);
    store.rebase(id);
    const next = {};
    for (const key of ['equipment', 'staff', 'security']) next[key] = def.upgrades.includes(key) && !!(upgrades && upgrades[key]);
    s.businesses[id].upgrades = next;
  }));

  ipcMain.handle('gta:set-supply', (_e, id, pct) => mutate(s => {
    business(id);
    store.rebase(id);
    s.businesses[id].supplyPct = num(pct, 0, 100);
  }));

  ipcMain.handle('gta:set-stock', (_e, id, units) => mutate(s => {
    const def = business(id);
    store.rebase(id);
    s.businesses[id].stock = num(units, 0, def.capacity);
  }));

  ipcMain.handle('gta:set-calibration', (_e, id, cal) => mutate(s => {
    business(id);
    store.rebase(id);
    const next = {};
    if (cal && cal.barMinutes) next.barMinutes = num(cal.barMinutes, 1, 24 * 60);
    if (cal && cal.minutesPerUnit) next.minutesPerUnit = num(cal.minutesPerUnit, 0.1, 600);
    s.businesses[id].calibration = next;
  }));

  ipcMain.handle('gta:set-settings', (_e, patch) => mutate(s => {
    if (!patch || typeof patch !== 'object') return;
    if ('detection' in patch && ['auto', 'always'].includes(patch.detection)) s.settings.detection = patch.detection;
    if ('paused' in patch) s.settings.paused = !!patch.paused;
    if ('warnMinutes' in patch) s.settings.warnMinutes = num(patch.warnMinutes, 0, 120);
    if ('notify' in patch) s.settings.notify = !!patch.notify;
    if ('closeToTray' in patch) s.settings.closeToTray = !!patch.closeToTray;
    if ('theme' in patch && OVERLAY[patch.theme]) {
      s.settings.theme = patch.theme;
      if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.setTitleBarOverlay(OVERLAY[patch.theme]); } catch { /* sem overlay neste sistema */ }
        mainWindow.setBackgroundColor(OVERLAY[patch.theme].color);
      }
    }
  }));

  // Fingerprint overlay controls from the main window.
  ipcMain.handle('gta:overlay', (_e, action, value) => {
    if (action === 'show') overlay.show();
    else if (action === 'hide') overlay.hide();
    else if (action === 'print') overlay.setPrint(String(value));
    else if (action === 'interact') overlay.setInteract(!!value);
    else if (action === 'suspend-hotkeys') overlay.suspendHotkeys(!!value);
    else if (action === 'configure' && value && typeof value === 'object') overlay.configure(value);
    else throw new TypeError('ação desconhecida');
    return snapshot();
  });

  // The overlay's own toolbar (move mode only). Rejects any other sender.
  ipcMain.handle('overlay:set', (e, patch) => {
    if (!overlay.isOverlay(e.sender) || !patch || typeof patch !== 'object') throw new Error('origem inválida');
    if (patch.print) overlay.setPrint(String(patch.print));
    if (patch.size) overlay.configure({ size: patch.size });
    if ('interact' in patch) overlay.setInteract(!!patch.interact);
    if (patch.hide) overlay.hide();
    return overlay.state();
  });

  ipcMain.handle('gta:cayo-cooldown', (_e, minutes) => mutate(s => {
    s.cayoCooldownEndsAt = minutes ? Date.now() + num(minutes, 1, 24 * 60) * 60000 : null;
  }));
}

function createWindow() {
  const theme = OVERLAY[store.get().settings.theme] ? store.get().settings.theme : 'dark';
  mainWindow = new BrowserWindow({
    title: 'GTA Helper', width: 1320, height: 880, minWidth: 980, minHeight: 640,
    backgroundColor: OVERLAY[theme].color, show: false,
    titleBarStyle: 'hidden', titleBarOverlay: OVERLAY[theme],
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.on('ready-to-show', () => mainWindow.show());
  // ready-to-show is not guaranteed on every system; make sure the window appears once loaded.
  mainWindow.webContents.once('did-finish-load', () => { if (!mainWindow.isVisible()) mainWindow.show(); });
  mainWindow.on('close', event => {
    if (!quitting && store.get().settings.closeToTray && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'app/index.html'));
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  else { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
}

function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets/tray.png')));
  } catch (error) {
    console.error('Bandeja indisponível:', error.message);
    tray = null;
    return;
  }
  tray.setToolTip('GTA Helper');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: showWindow },
    { label: 'Pausar/retomar timers', click: () => mutate(s => { s.settings.paused = !s.settings.paused; }) },
    { label: 'Mostrar/esconder digitais', click: () => (overlay.state().visible ? overlay.hide() : overlay.show()) },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showWindow);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_c, _p, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith('file:') && !details.url.startsWith('devtools:') });
    });
    Menu.setApplicationMenu(null);
    store = createStore(dataFile, catalog);
    watcher = createGameWatcher({ onChange: () => tick() });
    watcher.start();
    overlay = createOverlay({
      getSettings: () => store.get().settings,
      saveSettings: patch => { Object.assign(store.get().settings.overlay, patch); dirty = true; persist(); },
      onChange: broadcast
    });
    overlay.registerHotkeys();
    scanner = createScanner({
      isEnabled: () => store.get().settings.overlay.auto !== false && (watcher.isRunning() || !!process.env.GTA_HELPER_FAKE_SCREEN),
      onChange: broadcast
    });
    scanner.start();
    registerIpc();
    createTray();
    createWindow();
    lastTick = Date.now();
    setInterval(tick, TICK_MS);
    setInterval(persist, 30000);
  });
  app.on('before-quit', () => { quitting = true; tick(); dirty = true; persist(); if (overlay) overlay.destroy(); if (scanner) scanner.destroy(); });
  app.on('window-all-closed', () => { if (!tray) app.quit(); });
}
