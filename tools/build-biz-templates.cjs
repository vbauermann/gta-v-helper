// Builds data/biz-read.json: the card titles of the Master Control Terminal (Terrorbyte), cut from
// the screenshots in test/fixtures/biz at the canonical bar width (lib/biz-read.js). Each label
// names the card whose stock bar starts near (x, y) in the 720 px tall fixture. Also the names and
// count characters of the Nightclub "Sell Goods" tiles (1080 px tall fixture).
// Usage: node tools/build-biz-templates.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const R = require('../lib/biz-read.js');

const root = path.join(__dirname, '..');
const LABELS = {
  'mct1.ppm.gz': [[436, 367, 'nightclub'], [728, 367, 'bunker'], [1019, 367, 'cocaine'], [436, 639, 'meth'], [727, 639, 'weed'], [1019, 639, 'cash']],
  'mct2.ppm.gz': [[438, 356, 'documents']],
  'mct3.ppm.gz': [[160, 629, 'hangar']]
};

function loadPpm(file) {
  const buf = zlib.gunzipSync(fs.readFileSync(file));
  const nl = buf.indexOf(10);
  const [, width, height] = buf.subarray(0, nl).toString().split(' ').map(Number);
  return { data: new Uint8Array(buf.subarray(nl + 1)), width, height, channels: 3 };
}

const titles = {};
for (const [file, labels] of Object.entries(LABELS)) {
  const img = loadPpm(path.join(root, 'test/fixtures/biz', file));
  const cards = R.findCards(img);
  for (const [x, y, id] of labels) {
    const card = cards.find(c => Math.abs(c.x0 - x) <= 4 && Math.abs(c.y - y) <= 4);
    if (!card) throw new Error(`${file}: nenhum card em ${x},${y}`);
    (titles[id] = titles[id] || []).push(Buffer.from(R.titleTemplate(img, card)).toString('base64'));
  }
}
// Nightclub "Sell Goods": tiles by name and the characters of their counts. 7 and 9 don't show in
// the counts of this print; they come from the special orders ("15/27", gray) and the total ("$986,025", lilac).
const NIGHTCLUB = {
  'nightclub1.ppm.gz': {
    tiles: [[1054, 133, 'cargo', '8/50'], [1500, 133, 'sporting', '35/100'], [1054, 239, 'imports', '10/10'], [1500, 239, 'pharma', '20/20'],
      [1054, 344, 'organic', '11/80'], [1500, 344, 'printing', '15/60'], [1054, 449, 'cash', '40/40']],
    extra: [
      { box: { x0: 1850, x1: 1925, y0: 915, y1: 945 }, ink: (r, g, b) => Math.min(r, g, b) >= 65, text: '15/27', take: '7' },
      { box: { x0: 1795, x1: 1925, y0: 982, y1: 1016 }, ink: (r, g, b) => b >= 90 && b - g >= 40, text: '$986,025', take: '9' }
    ]
  }
};
const goods = {}, glyphs = {};
const addGlyph = (ch, g) => {
  const s = R.glyphShape(g);
  (glyphs[ch] = glyphs[ch] || []).push({ aspect: Math.round(s.aspect * 1000) / 1000, data: Buffer.from(s.data).toString('base64') });
};
for (const [file, def] of Object.entries(NIGHTCLUB)) {
  const img = loadPpm(path.join(root, 'test/fixtures/biz', file));
  const tiles = R.findTiles(img);
  for (const [x, y, id, text] of def.tiles) {
    const tile = tiles.find(t => Math.abs(t.x - x) <= 4 && Math.abs(t.y - y) <= 4);
    if (!tile) throw new Error(`${file}: nenhum quadro em ${x},${y}`);
    (goods[id] = goods[id] || []).push(Buffer.from(R.nameTemplate(img, tile)).toString('base64'));
    const c = { x0: tile.x + 0.7 * tile.w, x1: tile.x + 0.985 * tile.w, y0: tile.y + 0.08 * tile.h, y1: tile.y + 0.58 * tile.h };
    const gs = R.glyphs(img, c, (r, g, b) => Math.min(r, g, b) >= 120);
    if (gs.length !== text.length) throw new Error(`${file} ${id}: ${gs.length} caracteres, esperava ${text}`);
    gs.forEach((g, i) => { if (!glyphs[text[i]] || glyphs[text[i]].length < 3) addGlyph(text[i], g); });
  }
  for (const e of def.extra) {
    const gs = R.glyphs(img, e.box, e.ink);
    const tall = Math.max(...gs.map(g => g.y1 - g.y0 + 1));
    const chars = gs.filter(g => g.y1 - g.y0 + 1 >= tall * 0.6);
    const text = e.text.replace(',', '');
    if (chars.length !== text.length) throw new Error(`${file}: ${chars.length} caracteres, esperava ${e.text}`);
    addGlyph(e.take, chars[text.indexOf(e.take)]);
  }
}
const out = { canon: R.CANON, title: R.TITLE, titles, goods, glyphs };
fs.writeFileSync(path.join(root, 'data/biz-read.json'), JSON.stringify(out, null, 1) + '\n');
console.log('data/biz-read.json:', Object.keys(titles).join(', '), '|', Object.keys(goods).join(', '), '|', Object.keys(glyphs).sort().join(''));
