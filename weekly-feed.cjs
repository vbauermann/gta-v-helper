// This week's bonuses straight from the repository, so a new week arrives without a new version.
// The main process downloads data/weekly.json from GitHub, checks its shape, keeps a copy in the
// user's folder and swaps it in when it is a newer week than the one bundled with the app.
const fs = require('node:fs');
const { net } = require('electron');

const URL = 'https://raw.githubusercontent.com/vbauermann/gta-v-helper/main/data/weekly.json';
const CHECK_EVERY_MS = 3 * 3600 * 1000;
const MAX_BYTES = 256 * 1024;

const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isList = v => Array.isArray(v) && v.length <= 200;
const named = v => isList(v) && v.every(i => i && typeof i.name === 'string');

// Shape the renderer relies on; anything else is ignored.
function validWeekly(w) {
  if (!w || typeof w !== 'object') return false;
  if (!isDate(w.start) || !isDate(w.end) || !Number.isFinite(new Date(w.resetUtc).getTime())) return false;
  if (!isList(w.sources) || !isList(w.rotations) || !named(w.rewards) || !named(w.gunVan)) return false;
  if (!isList(w.bonuses) || !w.bonuses.length || !w.bonuses.every(g => typeof g.mult === 'string' && named(g.items))) return false;
  if (!isList(w.discounts) || !w.discounts.length || !w.discounts.every(g => Number.isFinite(g.pct) && named(g.items))) return false;
  const v = w.vehicles;
  return !!(v && v.podium && typeof v.podium.name === 'string' && v.prize && typeof v.prize.name === 'string' && named(v.testRides) && named(v.showroom));
}

// The newer of two weeks (by start date); `a` wins ties.
const newer = (a, b) => (b && validWeekly(b) && b.start > a.start ? b : a);

function createWeeklyFeed({ bundled, cacheFile, onChange }) {
  let current = bundled;
  try { current = newer(current, JSON.parse(fs.readFileSync(cacheFile, 'utf8'))); } catch { /* no cache yet */ }

  async function check() {
    try {
      const res = await net.fetch(URL, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      if (text.length > MAX_BYTES) return;
      const remote = JSON.parse(text);
      if (!validWeekly(remote) || JSON.stringify(remote) === JSON.stringify(current)) return;
      if (newer(current, remote) !== remote && remote.start !== current.start) return;
      current = remote;
      fs.writeFileSync(cacheFile, text);
      onChange(current);
    } catch {
      // Offline or GitHub unreachable: keep what we have.
    }
  }

  function start() {
    check();
    setInterval(check, CHECK_EVERY_MS).unref();
  }

  return { start, check, get: () => current };
}

module.exports = { createWeeklyFeed, validWeekly, newer, URL };
