// Real-time fingerprint helper: while GTA is running, takes a small grayscale screenshot of the
// game's screen about once a second (only the game window in windowed mode), finds the 4 right components of the Casino hack
// (lib/fp-match.js, in a worker thread) and draws a border around them in a transparent,
// click-through window on top of the game. Read-only on the screen like any capture tool: it
// never reads game memory, never injects and never sends input to GTA.
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { Worker } = require('node:worker_threads');
const { BrowserWindow, desktopCapturer, screen, ipcMain } = require('electron');
const { tileRect, region } = require('./lib/fp-match.js');
const { createGameWindow } = require('./game-window.cjs');

const SAMPLE_HEIGHT = 360; // height of the game area used for matching
const MAX_CAPTURE_HEIGHT = 1440; // cap when the game window is small
const INTERVAL_MS = 900;
const LOST_AFTER = 2; // misses in a row before the borders go away

// GTA_HELPER_FAKE_SCREEN: a .pgm.gz grayscale screenshot used instead of the real screen (tests).
let fakeCache = null;
function fakeScreen() {
  const file = process.env.GTA_HELPER_FAKE_SCREEN;
  if (!file) return null;
  if (fakeCache && fakeCache.file === file) return fakeCache.img;
  const buf = zlib.gunzipSync(fs.readFileSync(file));
  const nl = buf.indexOf(10);
  const [, width, height] = buf.subarray(0, nl).toString().split(' ').map(Number);
  fakeCache = { file, img: { data: new Uint8Array(buf.subarray(nl + 1)), width, height } };
  return fakeCache.img;
}

function createScanner({ isAuto, isActive, onChange }) {
  const isEnabled = () => isAuto() && isActive();
  let worker = null;
  let marker = null;
  let badge = null;
  let badgeState = null; // { on: true } while shown, null when hidden
  let timer = null;
  let busy = false;
  let misses = 0;
  let status = { state: 'off', picks: [], at: 0, ms: 0 };
  let boxes = [];
  let where = null; // { display, area } of the last capture, in DIPs
  const gameWindow = createGameWindow();
  const send = () => { if (marker && !marker.isDestroyed()) marker.webContents.send('marker:boxes', boxes); };
  const sendBadge = () => { if (badge && !badge.isDestroyed() && badgeState) badge.webContents.send('marker:badge', badgeState); };
  // Each page asks for its data once its listener is in place.
  ipcMain.on('marker:ready', e => {
    if (marker && !marker.isDestroyed() && e.sender === marker.webContents) send();
    if (badge && !badge.isDestroyed() && e.sender === badge.webContents) sendBadge();
  });

  function setStatus(next) {
    const changed = next.state !== status.state || next.picks.join() !== status.picks.join();
    status = next;
    if (changed) { draw(); onChange(); }
    updateBadge();
  }

  function display() { return screen.getPrimaryDisplay(); }

  // The game's display and its area on it, in DIPs: the window's client area in windowed mode,
  // the whole display in fullscreen/borderless or when the window can't be found.
  function gameArea() {
    const phys = gameWindow.rect();
    if (phys && process.platform === 'win32') {
      const dip = screen.screenToDipRect(null, phys);
      const d = screen.getDisplayMatching(dip);
      const b = d.bounds;
      const x = Math.max(b.x, dip.x), y = Math.max(b.y, dip.y);
      const area = { x, y, width: Math.min(b.x + b.width, dip.x + dip.width) - x, height: Math.min(b.y + b.height, dip.y + dip.height) - y };
      if (area.width > 100 && area.height > 100) return { display: d, area };
    }
    const d = display();
    return { display: d, area: { ...d.bounds } };
  }

  function ensureMarker() {
    if (marker && !marker.isDestroyed()) return marker;
    const { bounds } = display();
    marker = layerWindow({ ...bounds, title: 'GTA Helper marcador' }, 'marker.html');
    marker.on('closed', () => { marker = null; });
    return marker;
  }

  function layerWindow(opts, page) {
    const w = new BrowserWindow({
      ...opts, show: false, frame: false, transparent: true, resizable: false, movable: false,
      maximizable: false, minimizable: false, fullscreenable: false, skipTaskbar: true, focusable: false,
      hasShadow: false, alwaysOnTop: true, backgroundColor: '#00000000',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload-marker.cjs') }
    });
    w.setAlwaysOnTop(true, 'screen-saver');
    w.setIgnoreMouseEvents(true);
    w.setContentProtection(true); // keep our own layers out of the next screenshot
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    w.webContents.on('will-navigate', e => e.preventDefault());
    w.loadFile(path.join(__dirname, 'app', page));
    return w;
  }

  // Small "Detecção de digitais" pill (green dot) at the top right while it runs.
  function updateBadge() {
    const next = isEnabled() ? { on: true } : null;
    if (JSON.stringify(next) === JSON.stringify(badgeState)) return;
    badgeState = next;
    if (!next) { if (badge && !badge.isDestroyed()) badge.hide(); return; }
    if (!badge || badge.isDestroyed()) {
      badge = layerWindow({ width: 340, height: 40, title: 'GTA Helper detecção' }, 'badge.html');
      badge.on('closed', () => { badge = null; });
    }
    const area = display().workArea;
    badge.setBounds({ x: area.x + area.width - 340 - 16, y: area.y + 12, width: 340, height: 40 });
    sendBadge();
    if (!badge.isVisible()) badge.showInactive();
    badge.moveTop();
  }

  // Called when the setting changes (shortcut or switch in the app).
  function toggled() {
    // Switching off hides the borders at once, even with a capture still in flight.
    if (!isEnabled()) { misses = 0; setStatus({ state: 'off', picks: [], at: Date.now(), ms: 0 }); }
    updateBadge();
    scan();
  }

  function draw() {
    if (status.state !== 'found') {
      if (marker && !marker.isDestroyed()) marker.hide();
      return;
    }
    const w = ensureMarker();
    const { display: d, area } = where || { display: display(), area: display().bounds };
    w.setBounds(d.bounds);
    // Boxes are relative to the marker window, which covers the game's display.
    boxes = status.picks.map(i => {
      const r = tileRect(i, area.width, area.height);
      return { ...r, x: r.x + area.x - d.bounds.x, y: r.y + area.y - d.bounds.y };
    });
    send();
    if (!w.isVisible()) w.showInactive();
    w.moveTop();
  }

  // Grayscale image of the game area, about SAMPLE_HEIGHT tall, plus where it is (for the boxes).
  async function grab() {
    const fake = fakeScreen();
    if (fake) return { img: fake, at: { display: display(), area: { ...display().bounds } } };
    const at = gameArea();
    const d = at.display;
    const height = Math.round(Math.min(MAX_CAPTURE_HEIGHT, d.size.height * d.scaleFactor, SAMPLE_HEIGHT * d.size.height / at.area.height));
    const width = Math.round(height * d.size.width / d.size.height);
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
    const src = sources.find(s => s.display_id === String(d.id)) || sources[0];
    if (!src || src.thumbnail.isEmpty()) return null;
    const { width: w, height: h } = src.thumbnail.getSize();
    const bgra = src.thumbnail.toBitmap();
    const gray = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = (bgra[p] * 29 + bgra[p + 1] * 150 + bgra[p + 2] * 77) >> 8;
    const k = w / d.bounds.width;
    const area = { x: (at.area.x - d.bounds.x) * k, y: (at.area.y - d.bounds.y) * k, width: at.area.width * k, height: at.area.height * k };
    return { img: region({ data: gray, width: w, height: h }, area), at };
  }

  function analyze(img) {
    if (!worker) {
      // Workers can't load from inside app.asar; the installer ships lib/ unpacked next to it.
      const file = path.join(__dirname, 'lib/fp-worker.cjs').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
      worker = new Worker(file);
      worker.unref();
    }
    return new Promise((resolve, reject) => {
      const onMsg = r => { worker.off('error', onErr); resolve(r); };
      const onErr = e => { worker.off('message', onMsg); worker = null; reject(e); };
      worker.once('message', onMsg);
      worker.once('error', onErr);
      worker.postMessage(img);
    });
  }

  async function scan() {
    if (busy) return;
    if (!isEnabled()) { gameWindow.stop(); misses = 0; setStatus({ state: 'off', picks: [], at: Date.now(), ms: 0 }); updateBadge(); return; }
    gameWindow.start();
    busy = true;
    const t = Date.now();
    try {
      const shot = await grab();
      const r = shot ? await analyze(shot.img) : { found: false, picks: [] };
      // The window moved or resized while the same pieces are shown: move the boxes with it.
      const moved = shot && JSON.stringify(shot.at.area) !== JSON.stringify(where && where.area);
      if (shot) where = shot.at;
      if (moved && r.found && status.state === 'found') draw();
      if (!isEnabled()) { setStatus({ state: 'off', picks: [], at: Date.now(), ms: 0 }); return; }
      if (r.found) { misses = 0; setStatus({ state: 'found', picks: r.picks, at: Date.now(), ms: Date.now() - t }); }
      else if (++misses >= LOST_AFTER || status.state !== 'found') setStatus({ state: 'searching', picks: [], at: Date.now(), ms: Date.now() - t });
    } catch (err) {
      setStatus({ state: 'error', picks: [], at: Date.now(), ms: 0, error: String(err && err.message || err) });
    } finally {
      busy = false;
    }
  }

  function start() {
    if (!timer) timer = setInterval(scan, INTERVAL_MS);
    scan();
  }

  function destroy() {
    clearInterval(timer);
    timer = null;
    gameWindow.stop();
    if (worker) worker.terminate();
    if (marker && !marker.isDestroyed()) marker.destroy();
    if (badge && !badge.isDestroyed()) badge.destroy();
  }

  return { start, destroy, toggled, refresh: scan, state: () => ({ state: status.state, picks: status.picks, ms: status.ms, error: status.error || null }) };
}

module.exports = { createScanner };
