// Detects whether GTA V is running by listing processes. Never opens, reads or touches the game
// process itself: it only asks Windows for the process list, like Task Manager does.
const { execFile } = require('node:child_process');

const GAME_EXES = ['gta5.exe', 'gta5_enhanced.exe'];

function parseTasklist(csv) {
  const names = new Set();
  for (const line of csv.split(/\r?\n/)) {
    const match = line.match(/^"([^"]+)"/);
    if (match) names.add(match[1].toLowerCase());
  }
  return GAME_EXES.some(exe => names.has(exe));
}

function createGameWatcher({ intervalMs = 10000, onChange }) {
  const supported = process.platform === 'win32';
  let running = false;
  let timer = null;

  function poll() {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) return;
      const next = parseTasklist(stdout);
      if (next !== running) {
        running = next;
        onChange(running);
      }
    });
  }

  return {
    supported,
    isRunning: () => running,
    start() {
      if (!supported || timer) return;
      poll();
      timer = setInterval(poll, intervalMs);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { createGameWatcher, parseTasklist, GAME_EXES };
