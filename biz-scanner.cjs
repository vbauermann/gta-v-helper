// Business screens reader: while GTA is running, takes a color screenshot every couple of seconds
// and looks for the Terrorbyte's Master Control Terminal or the Nightclub's "Sell Goods" page
// (lib/biz-read.js, in a worker thread). A reading seen twice in a row is handed to onRead, which
// updates the businesses. Read-only on the screen like any capture tool: it never reads game
// memory, never injects and never sends input to GTA (ADR 0002).
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { Worker } = require('node:worker_threads');
const { desktopCapturer, screen } = require('electron');

const INTERVAL_MS = 2000;
const templates = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/biz-read.json'), 'utf8'));
const MAX_HEIGHT = 1440; // the Nightclub counts need about 1080 px; more only costs time

// GTA_HELPER_FAKE_BIZ_SCREEN: a .ppm.gz color screenshot used instead of the real screen (tests).
function fakeScreen() {
  const file = process.env.GTA_HELPER_FAKE_BIZ_SCREEN;
  if (!file) return null;
  const buf = zlib.gunzipSync(fs.readFileSync(file));
  const nl = buf.indexOf(10);
  const [, width, height] = buf.subarray(0, nl).toString().split(' ').map(Number);
  return { data: new Uint8Array(buf.subarray(nl + 1)), width, height, bgra: false };
}

// Same reading (values rounded) means the screen is settled, not mid-animation.
const signature = r => (r ? JSON.stringify(r.screen === 'mct'
  ? r.cards.map(c => [c.id, Math.round(c.stock * 100), c.supplies == null ? null : Math.round(c.supplies * 100)]).sort()
  : r.goods.map(g => [g.id, g.units, g.max]).sort()) : '');

function createBizScanner({ isActive, onRead, onChange }) {
  let worker = null;
  let timer = null;
  let busy = false;
  let last = '';
  let applied = '';
  let status = { state: 'off', screen: null, at: 0 };

  function setStatus(next) {
    const changed = next.state !== status.state || next.screen !== status.screen;
    status = next;
    if (changed) onChange();
  }

  async function grab() {
    const fake = fakeScreen();
    if (fake) return fake;
    // The display the player is on (where the mouse is), at most MAX_HEIGHT tall.
    const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const height = Math.round(Math.min(MAX_HEIGHT, d.size.height * d.scaleFactor));
    const width = Math.round(height * d.size.width / d.size.height);
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
    const src = sources.find(s => s.display_id === String(d.id)) || sources[0];
    if (!src || src.thumbnail.isEmpty()) return null;
    const size = src.thumbnail.getSize();
    return { data: new Uint8Array(src.thumbnail.toBitmap()), width: size.width, height: size.height, bgra: true };
  }

  function analyze(img) {
    if (!worker) {
      // Workers can't load from inside app.asar; the installer ships lib/ unpacked next to it.
      const file = path.join(__dirname, 'lib/biz-worker.cjs').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
      worker = new Worker(file, { workerData: { templates } });
      worker.unref();
    }
    return new Promise((resolve, reject) => {
      const onMsg = r => { worker.off('error', onErr); resolve(r); };
      const onErr = e => { worker.off('message', onMsg); worker = null; reject(e); };
      worker.once('message', onMsg);
      worker.once('error', onErr);
      worker.postMessage(img, [img.data.buffer]);
    });
  }

  async function scan() {
    if (busy) return;
    if (!isActive()) { last = ''; applied = ''; setStatus({ ...status, state: 'off', screen: null }); return; }
    busy = true;
    try {
      const img = await grab();
      const r = img ? await analyze(img) : null;
      const sig = signature(r);
      if (!r) { last = ''; applied = ''; setStatus({ ...status, state: 'watching', screen: null }); return; }
      if (sig === last && sig !== applied && isActive()) {
        applied = sig;
        onRead(r);
        setStatus({ state: 'watching', screen: r.screen, at: Date.now() });
      } else setStatus({ ...status, state: 'watching', screen: r.screen });
      last = sig;
    } catch (err) {
      setStatus({ ...status, state: 'error', error: String(err && err.message || err) });
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
    if (worker) worker.terminate();
  }

  return { start, destroy, refresh: scan, state: () => ({ state: status.state, screen: status.screen, at: status.at, error: status.error || null }) };
}

module.exports = { createBizScanner, signature };
