// Fingerprint overlay: a separate transparent window kept above the game (borderless windowed).
// It never touches the game process: no hooks, no injection, no input sent to GTA. While in game
// mode it is click-through and never takes focus; "move mode" lets the mouse drag it around.
const path = require('node:path');
const { BrowserWindow, screen, globalShortcut } = require('electron');
const Hotkeys = require('./lib/hotkeys.js');

const PRINTS = ['S', 'O', 'J', 'L'];
const TILE = { sm: 200, md: 280, lg: 380 }; // width of one fingerprint, in DIPs
const HEADER = 30;
const MARGIN = 24;

function createOverlay({ getSettings, saveSettings, onChange }) {
  let win = null;
  let visible = false;
  let interact = false;
  let hotkeysFailed = [];
  let registered = [];

  const settings = () => getSettings().overlay;

  function size() {
    const s = settings();
    const header = HEADER + (interact ? 28 : 0); // move mode adds a toolbar row
    const tile = TILE[s.size] || TILE.md;
    if (s.print === 'all') {
      const small = Math.round(tile * 0.62);
      return { width: small * 2 + 6, height: Math.round(small * 1.02) * 2 + 6 + header };
    }
    return { width: tile, height: Math.round(tile * 1.02) + header };
  }

  // Saved position if it still lands on a connected screen, else the top-right of the primary one.
  function bounds() {
    const { width, height } = size();
    const pos = settings().pos;
    if (pos) {
      const area = screen.getDisplayMatching({ x: pos.x, y: pos.y, width, height }).workArea;
      const inside = pos.x >= area.x - width / 2 && pos.x + width / 2 <= area.x + area.width && pos.y >= area.y && pos.y < area.y + area.height - 20;
      if (inside) return { x: pos.x, y: pos.y, width, height };
    }
    const area = screen.getPrimaryDisplay().workArea;
    return { x: area.x + area.width - width - MARGIN, y: area.y + MARGIN + 60, width, height };
  }

  function ensureWindow() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow({
      ...bounds(),
      show: false, frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
      fullscreenable: false, skipTaskbar: true, focusable: false, hasShadow: false, alwaysOnTop: true,
      backgroundColor: '#00000000', title: 'GTA Helper overlay',
      webPreferences: {
        nodeIntegration: false, contextIsolation: true, sandbox: true,
        preload: path.join(__dirname, 'preload-overlay.cjs')
      }
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setIgnoreMouseEvents(true, { forward: true });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.on('moved', () => {
      if (!interact) return; // only remember where the user dragged it
      const [x, y] = win.getPosition();
      saveSettings({ pos: { x, y } });
    });
    win.on('closed', () => { win = null; visible = false; interact = false; onChange(); });
    win.webContents.on('did-finish-load', push);
    win.loadFile(path.join(__dirname, 'app/overlay.html'));
    return win;
  }

  function state() {
    const s = settings();
    return { visible, interact, print: s.print, size: s.size, opacity: s.opacity, hotkeys: s.hotkeys, auto: s.auto !== false, keys: Hotkeys.normalize(s.keys), hotkeysFailed };
  }

  function push() {
    if (win && !win.isDestroyed()) win.webContents.send('overlay:state', state());
  }

  function relayout() {
    if (!win || win.isDestroyed()) return;
    win.setBounds(bounds());
    push();
  }

  function show() {
    const w = ensureWindow();
    w.setBounds(bounds());
    w.showInactive(); // never steal focus from the game
    w.moveTop();
    visible = true;
    push();
    onChange();
  }

  function hide() {
    if (interact) setInteract(false);
    if (win && !win.isDestroyed()) win.hide();
    visible = false;
    onChange();
  }

  function setInteract(on) {
    interact = !!on;
    if (interact && !visible) show();
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(!interact, { forward: true });
      win.setFocusable(interact);
    }
    relayout();
    onChange();
  }

  function setPrint(print) {
    if (print !== 'all' && !PRINTS.includes(print)) throw new TypeError('digital desconhecida');
    saveSettings({ print });
    relayout();
    show();
  }

  // Patch from the app or the overlay itself: size, opacity, hotkeys, position reset.
  function configure(patch) {
    const next = {};
    if (patch.size && TILE[patch.size]) next.size = patch.size;
    if ('opacity' in patch) next.opacity = Math.min(1, Math.max(0.4, Number(patch.opacity) || 1));
    if ('hotkeys' in patch) next.hotkeys = !!patch.hotkeys;
    if ('auto' in patch) next.auto = !!patch.auto;
    if (patch.resetPosition) next.pos = null;
    if (patch.resetKeys) next.keys = { ...Hotkeys.DEFAULT_KEYS };
    if (patch.key && typeof patch.key === 'object') {
      const { id, accel } = patch.key;
      if (!Hotkeys.ACTIONS.some(a => a.id === id)) throw new TypeError('atalho desconhecido');
      if (!Hotkeys.isValid(accel)) throw new TypeError('combinação inválida: use Ctrl, Alt ou Shift com uma letra, número ou F1 a F24');
      const keys = { ...Hotkeys.normalize(settings().keys), [id]: accel };
      const clash = Hotkeys.ACTIONS.find(a => a.id !== id && keys[a.id] === accel);
      if (clash) throw new TypeError(`${accel} já está em "${clash.label}"`);
      next.keys = keys;
    }
    saveSettings(next);
    if ('hotkeys' in next || 'keys' in next) registerHotkeys();
    relayout();
    onChange();
  }

  const HANDLERS = {
    toggle: () => (visible ? hide() : show()),
    all: () => setPrint('all'),
    S: () => setPrint('S'), O: () => setPrint('O'), J: () => setPrint('J'), L: () => setPrint('L'),
    move: () => setInteract(!interact)
  };

  function unregisterAll() {
    for (const accel of registered) globalShortcut.unregister(accel);
    registered = [];
  }

  // suspended: the app is recording a new combo, so nothing may swallow the keys meanwhile.
  function registerHotkeys(suspended = false) {
    unregisterAll();
    hotkeysFailed = [];
    if (!settings().hotkeys || suspended) return;
    const keys = Hotkeys.normalize(settings().keys);
    for (const { id } of Hotkeys.ACTIONS) {
      let ok = false;
      try { ok = globalShortcut.register(keys[id], HANDLERS[id]); } catch { ok = false; }
      if (ok) registered.push(keys[id]);
      else hotkeysFailed.push(keys[id]);
    }
  }

  function suspendHotkeys(on) {
    registerHotkeys(!!on);
    onChange();
  }

  function isOverlay(sender) {
    return !!win && !win.isDestroyed() && sender === win.webContents;
  }

  function destroy() {
    unregisterAll();
    if (win && !win.isDestroyed()) win.destroy();
  }

  return { show, hide, setInteract, setPrint, configure, registerHotkeys, suspendHotkeys, state, isOverlay, destroy, PRINTS };
}

module.exports = { createOverlay, PRINTS };
