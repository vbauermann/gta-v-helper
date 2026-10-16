// App updates from the GitHub releases of vbauermann/gta-v-helper (electron-updater + the NSIS
// installer). Only the installed app updates itself; a dev run or the portable folder just reports
// that updates are off. Downloads in the background and asks before restarting.
const { app } = require('electron');
const { version } = require('./package.json');

const CHECK_EVERY_MS = 4 * 3600 * 1000;

function createUpdater({ onChange, beforeInstall }) {
  let status = { state: 'off', version: null, percent: 0, error: null };
  let updater = null;
  const set = patch => { status = { ...status, ...patch }; onChange(); };

  function supported() {
    if (!app.isPackaged || process.platform !== 'win32') return false;
    try {
      ({ autoUpdater: updater } = require('electron-updater'));
      return true;
    } catch {
      return false; // portable build without node_modules
    }
  }

  function start() {
    if (!supported()) return;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('checking-for-update', () => set({ state: 'checking', error: null }));
    updater.on('update-not-available', () => set({ state: 'latest' }));
    updater.on('update-available', info => set({ state: 'downloading', version: info.version, percent: 0 }));
    updater.on('download-progress', p => set({ state: 'downloading', percent: Math.round(p.percent || 0) }));
    updater.on('update-downloaded', info => set({ state: 'ready', version: info.version, percent: 100 }));
    updater.on('error', err => set({ state: 'error', error: String((err && err.message) || err).split('\n')[0].slice(0, 200) }));
    check();
    setInterval(check, CHECK_EVERY_MS).unref();
  }

  function check() {
    if (!updater || status.state === 'downloading' || status.state === 'ready') return;
    updater.checkForUpdates().catch(() => { /* reported by the error event */ });
  }

  function install() {
    if (!updater || status.state !== 'ready') throw new Error('nenhuma atualização pronta');
    beforeInstall();
    setImmediate(() => updater.quitAndInstall(true, true));
  }

  return { start, check, install, state: () => ({ ...status, current: version }) };
}

module.exports = { createUpdater };
