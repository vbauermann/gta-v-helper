// On-screen notices: a click-through layer at the top right of the screen, over the game (borderless
// windowed), like the fingerprint badge. Each notice stays 10 s; at most 3 at a time.
const path = require('path');
const { BrowserWindow, screen, ipcMain } = require('electron');

const DURATION = 10000;
const MAX = 3;
const WIDTH = 400, HEIGHT = 280;

// corner(): the area whose top right corner holds the notices (game window or screen), or null.
function createToasts({ corner } = {}) {
  let win = null;
  let list = []; // { id, kind, title, body, until }
  let timer = null;

  const send = () => {
    if (win && !win.isDestroyed()) win.webContents.send('marker:toasts', list.map(({ id, kind, title, body }) => ({ id, kind, title, body })));
  };
  ipcMain.on('marker:ready', e => { if (win && !win.isDestroyed() && e.sender === win.webContents) send(); });

  function ensure() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow({
      width: WIDTH, height: HEIGHT, show: false, frame: false, transparent: true, resizable: false, movable: false,
      maximizable: false, minimizable: false, fullscreenable: false, skipTaskbar: true, focusable: false,
      hasShadow: false, alwaysOnTop: true, backgroundColor: '#00000000', title: 'GTA Helper avisos na tela',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload-marker.cjs') }
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true);
    win.setContentProtection(true); // stays out of the screen reader's captures
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    win.on('closed', () => { win = null; });
    win.loadFile(path.join(__dirname, 'app', 'toast.html'));
    return win;
  }

  function update() {
    const now = Date.now();
    list = list.filter(t => t.until > now);
    clearTimeout(timer);
    timer = null;
    if (!list.length) {
      if (win && !win.isDestroyed()) { send(); win.hide(); }
      return;
    }
    const w = ensure();
    place(w);
    send();
    if (!w.isVisible()) w.showInactive();
    w.moveTop();
    // Follows the game window while the notices are on screen (windowed mode).
    timer = setTimeout(update, Math.min(1000, Math.min(...list.map(t => t.until)) - now + 20));
  }

  function place(w) {
    // Below the "Detecção de digitais" badge (top right, 40 px tall), in the game window when windowed.
    const area = (corner && corner()) || screen.getPrimaryDisplay().workArea;
    const next = { x: Math.round(area.x + area.width - WIDTH - 16), y: Math.round(area.y + 60), width: WIDTH, height: HEIGHT };
    const cur = w.getBounds();
    if (cur.x !== next.x || cur.y !== next.y) w.setBounds(next);
  }

  function show(item) {
    list.unshift({ id: item.id, kind: item.kind, title: item.title, body: item.body, until: Date.now() + DURATION });
    list.length = Math.min(list.length, MAX);
    update();
  }

  function destroy() {
    clearTimeout(timer);
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
  }

  return { show, destroy, window: () => win };
}

module.exports = { createToasts, DURATION };
