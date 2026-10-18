// Heist wiki (data/wiki.json) straight from the repository, so a fixed tip or a new heist arrives
// without a new version. Same idea as weekly-feed.cjs: download, check the shape, keep a copy in the
// user's folder and swap it in when its `version` is newer than the one we have.
const fs = require('node:fs');
const { net } = require('electron');

const URL = 'https://raw.githubusercontent.com/vbauermann/gta-v-helper/main/data/wiki.json';
const CHECK_EVERY_MS = 6 * 3600 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;

const str = v => typeof v === 'string' && v.length > 0;
const strs = v => Array.isArray(v) && v.length <= 100 && v.every(str);
const SOURCE = /^https:\/\/gta\.fandom\.com\/wiki\/[^\s]+$/;

// Shape the renderer relies on; anything else is ignored.
function validWiki(w) {
  if (!w || typeof w !== 'object' || !/^\d{4}-\d{2}-\d{2}(\.\d+)?$/.test(w.version)) return false;
  if (!w.heists || typeof w.heists !== 'object' || !Object.keys(w.heists).length) return false;
  return Object.entries(w.heists).every(([id, x]) => x && x.id === id && validHeist(x));
}

function validHeist(x) {
  if (!str(x.name) || !SOURCE.test(x.source) || !strs(x.overview)) return false;
  if (!Array.isArray(x.facts) || !x.facts.every(f => f && str(f.label) && str(f.value))) return false;
  const approaches = x.approaches || [];
  if (!Array.isArray(approaches) || !approaches.every(a => a && str(a.id) && str(a.name) && str(a.summary))) return false;
  const ids = new Set(approaches.map(a => a.id));
  const sections = x.sections || [];
  if (!Array.isArray(sections) || !sections.every(c => c && str(c.id) && str(c.title) && (c.note == null || str(c.note)))) return false;
  const sectionIds = new Set(sections.map(c => c.id));
  if (!Array.isArray(x.setups) || !x.setups.length) return false;
  const seen = new Set();
  for (const s of x.setups) {
    if (!s || !str(s.id) || seen.has(s.id) || !str(s.name) || !str(s.kind) || !str(s.goal) || !strs(s.steps) || !strs(s.tips)) return false;
    if (s.source && !SOURCE.test(s.source)) return false;
    if (s.approaches && !(strs(s.approaches) && s.approaches.every(a => ids.has(a)))) return false;
    if (s.group != null && !str(s.group)) return false;
    if (sections.length ? !sectionIds.has(s.section) : s.section != null) return false;
    seen.add(s.id);
  }
  const f = x.finale;
  if (!f || !str(f.summary) || !strs(f.steps) || !strs(f.tips)) return false;
  if (f.roles && !(Array.isArray(f.roles) && f.roles.every(r => r && str(r.name) && str(r.text)))) return false;
  if (f.source && !SOURCE.test(f.source)) return false;
  return !f.variants || (Array.isArray(f.variants) && f.variants.every(v => v && ids.has(v.approach) && str(v.name) && str(v.summary)
    && strs(v.steps) && strs(v.tips || []) && (!v.source || SOURCE.test(v.source))));
}

const newer = (a, b) => (b && validWiki(b) && b.version > a.version ? b : a);

function createWikiFeed({ bundled, cacheFile, onChange }) {
  let current = bundled;
  try { current = newer(current, JSON.parse(fs.readFileSync(cacheFile, 'utf8'))); } catch { /* no cache yet */ }

  async function check() {
    try {
      const res = await net.fetch(URL, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      if (text.length > MAX_BYTES) return;
      const remote = JSON.parse(text);
      if (newer(current, remote) !== remote) return;
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

module.exports = { createWikiFeed, validWiki, newer, URL };
