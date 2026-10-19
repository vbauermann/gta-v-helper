// Reads the business bars of the Terrorbyte's Master Control Terminal from a color screenshot.
// Each unlocked card ends in a green bar (stock) and, for the MC businesses and the bunker, a blue
// bar below it (supplies). Bars are found by color, so they work at any resolution and in any order
// (the cards can be dragged around); the card is told by its title, matched against templates
// (data/biz-read.json, built by tools/build-biz-templates.cjs). Everything is relative to the bar
// width. UMD: used by the capture worker, the template tool and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaBizRead = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Card geometry in units of the bar width, measured on 3440x1440 screenshots.
  const TITLE = { dy: 0.807, width: 0.9, height: 0.075 }; // title center above the top of the stock bar
  const SEARCH = { x: 0.04, y: 0.07 }; // how far around that the title is looked for
  const CANON = 160; // bar width the templates are stored at
  const MIN_TITLE = 0.75; // NCC of the best title
  const MIN_GAP = 0.08; // best title minus the second best

  const GREEN = 1, BLUE = 2;
  // 0: none; fill/track of the green (stock) and blue (supplies) bars. Tracks are dark and only
  // slightly tinted, the panel behind them is gray-blue.
  function kind(r, g, b) {
    if (g - r >= 40 && g - b >= 15 && g >= 90) return { fam: GREEN, fill: true };
    if (b - r >= 50 && b - g >= 25 && b >= 100) return { fam: BLUE, fill: true };
    if (g - r >= 14 && g - b >= -2 && g < 90) return { fam: GREEN, fill: false };
    if (b - r >= 20 && b - g >= 8 && b < 100) return { fam: BLUE, fill: false };
    return null;
  }

  // Horizontal runs of one bar color on each row. img: { data, width, height, channels (3|4) }.
  function rowRuns(img, minLen) {
    const { data, width, height } = img, ch = img.channels || 3;
    const runs = [];
    const maxGap = Math.max(2, Math.round(minLen * 0.03));
    for (let y = 0; y < height; y++) {
      let cur = null, gap = 0;
      const close = () => {
        if (cur && cur.x1 - cur.x0 + 1 >= minLen) runs.push(cur);
        cur = null;
      };
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * ch;
        const k = kind(data[i], data[i + 1], data[i + 2]);
        if (k && cur && k.fam === cur.fam) {
          cur.x1 = x; gap = 0;
          if (k.fill) { cur.fills++; cur.fillEnd = x; } else cur.tracks++;
        } else if (cur && gap < maxGap && !(k && k.fam !== cur.fam)) gap++;
        else {
          close();
          if (k) { cur = { y, fam: k.fam, x0: x, x1: x, fills: k.fill ? 1 : 0, tracks: k.fill ? 0 : 1, fillEnd: k.fill ? x : -1 }; gap = 0; }
        }
      }
      close();
    }
    return runs;
  }

  // A bar is a stack of rows with the same extent, about 3% of its width thick, filled from the
  // left: fill pixels first, then track.
  function findBars(img) {
    const minLen = Math.max(60, Math.round(img.width * 0.05));
    const runs = rowRuns(img, minLen).filter(r => r.fills + r.tracks >= (r.x1 - r.x0 + 1) * 0.85);
    const groups = [];
    for (const r of runs) {
      const tol = Math.max(2, (r.x1 - r.x0) * 0.012);
      const g = groups.find(o => o.fam === r.fam && r.y - o.y1 <= 2 && Math.abs(o.x0 - r.x0) <= tol && Math.abs(o.x1 - r.x1) <= tol);
      if (g) { g.y1 = r.y; g.rows.push(r); } else groups.push({ fam: r.fam, x0: r.x0, x1: r.x1, y0: r.y, y1: r.y, rows: [r] });
    }
    const bars = [];
    for (const g of groups) {
      const xs0 = median(g.rows.map(r => r.x0)), xs1 = median(g.rows.map(r => r.x1));
      const len = xs1 - xs0 + 1, thick = g.y1 - g.y0 + 1;
      if (thick < 3 || thick < len * 0.015 || thick > len * 0.07) continue;
      // Fill must be a prefix: fill pixels up to fillEnd, track after it.
      const ends = g.rows.map(r => r.fillEnd);
      const end = median(ends);
      const fill = end < 0 ? 0 : Math.min(1, Math.max(0, (end - xs0 + 1) / len));
      bars.push({ fam: g.fam === GREEN ? 'green' : 'blue', x0: xs0, x1: xs1, y0: g.y0, y1: g.y1, fill });
    }
    return bars;
  }

  // Merges pieces of one bar split by something on top of it (the mouse pointer), when together
  // they are as long as the other bars.
  function mergeSplit(bars) {
    const typical = bars.length ? median(bars.map(b => b.x1 - b.x0)) : 0;
    const out = [];
    for (const b of [...bars].sort((p, q) => p.x0 - q.x0)) {
      const prev = out.find(o => o.fam === b.fam && Math.min(o.y1, b.y1) - Math.max(o.y0, b.y0) + 1 >= Math.min(o.y1 - o.y0, b.y1 - b.y0) * 0.5 && b.x0 > o.x1
        && Math.abs(b.x1 - o.x0 - typical) <= typical * 0.03);
      if (!prev) { out.push({ ...b }); continue; }
      const len0 = prev.x1 - prev.x0 + 1;
      const filled = b.fill > 0 ? prev.fill * len0 + (b.x0 - prev.x1 - 1) + b.fill * (b.x1 - b.x0 + 1) : prev.fill * len0;
      prev.x1 = b.x1;
      prev.fill = filled / (prev.x1 - prev.x0 + 1);
    }
    return out;
  }

  // Cards: each green bar plus the blue bar right under it (when there is one).
  function findCards(img) {
    const bars = mergeSplit(findBars(img));
    const greens = bars.filter(b => b.fam === 'green');
    const blues = bars.filter(b => b.fam === 'blue');
    return greens.map(g => {
      const w = g.x1 - g.x0 + 1, tol = w * 0.03;
      const blue = blues.find(b => Math.abs(b.x0 - g.x0) <= tol && Math.abs(b.x1 - g.x1) <= tol && b.y0 > g.y1 && b.y0 - g.y1 <= w * 0.06);
      return { x0: g.x0, x1: g.x1, y: g.y0, width: w, stock: g.fill, supplies: blue ? blue.fill : null };
    });
  }

  // Grayscale sample of the image at scale k (k image px per canonical px), top-left at (ox, oy).
  function sample(img, ox, oy, w, h, k) {
    const ch = img.channels || 3, out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(img.height - 1.001, Math.max(0, oy + y * k)), y0 = Math.floor(fy), ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(img.width - 1.001, Math.max(0, ox + x * k)), x0 = Math.floor(fx), tx = fx - x0;
        const px = (xx, yy) => {
          const i = (yy * img.width + xx) * ch;
          return img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
        };
        const a = px(x0, y0), b = px(x0 + 1, y0), c = px(x0, y0 + 1), d = px(x0 + 1, y0 + 1);
        out[y * w + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
      }
    }
    return out;
  }

  // Title band of a card at canonical scale, centered where the title should be, with margins.
  function titleArea(img, card) {
    const k = card.width / CANON;
    const tw = Math.round(TITLE.width * CANON), th = Math.round(TITLE.height * CANON);
    const mx = Math.round(SEARCH.x * CANON), my = Math.round(SEARCH.y * CANON);
    const cx = (card.x0 + card.x1) / 2, cy = card.y - TITLE.dy * card.width;
    const w = tw + 2 * mx, h = th + 2 * my;
    return { data: sample(img, cx - (w / 2) * k, cy - (h / 2) * k, w, h, k), width: w, height: h, tw, th, mx, my };
  }

  // Template (the title band with no margin) cut from a card, for tools/build-biz-templates.cjs.
  function titleTemplate(img, card) {
    const a = titleArea(img, card);
    const out = new Uint8Array(a.tw * a.th);
    for (let y = 0; y < a.th; y++) {
      for (let x = 0; x < a.tw; x++) out[y * a.tw + x] = Math.round(a.data[(y + a.my) * a.width + x + a.mx]);
    }
    return out;
  }

  function nccBest(area, tpl) {
    const n = area.tw * area.th;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += tpl[i];
    mean /= n;
    const z = new Float32Array(n);
    let tn = 0;
    for (let i = 0; i < n; i++) { z[i] = tpl[i] - mean; tn += z[i] * z[i]; }
    tn = Math.sqrt(tn) + 1e-6;
    let best = -1;
    for (let oy = 0; oy <= 2 * area.my; oy++) {
      for (let ox = 0; ox <= 2 * area.mx; ox++) {
        let s = 0, q = 0, num = 0;
        for (let y = 0; y < area.th; y++) {
          const row = (oy + y) * area.width + ox, trow = y * area.tw;
          for (let x = 0; x < area.tw; x++) {
            const v = area.data[row + x];
            s += v; q += v * v; num += v * z[trow + x];
          }
        }
        const varW = q - (s * s) / n;
        if (varW <= 1e-3) continue;
        const r = num / (Math.sqrt(varW) * tn);
        if (r > best) best = r;
      }
    }
    return best;
  }

  const fromB64 = s => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  const cache = new WeakMap();
  // Decoded templates of one group ('titles', 'goods' or 'glyphs'), kept per templates object.
  function decode(templates, group) {
    let c = cache.get(templates);
    if (!c) cache.set(templates, c = {});
    if (!c[group]) {
      c[group] = [];
      for (const [id, arr] of Object.entries(templates[group] || {})) {
        for (const t of arr) c[group].push(typeof t === 'string' ? { id, data: fromB64(t) } : { id, aspect: t.aspect, data: fromB64(t.data) });
      }
    }
    return c[group];
  }

  // Best template of a group over an area, or null when unsure.
  function best(area, list, minScore) {
    const scores = {};
    for (const t of list) scores[t.id] = Math.max(scores[t.id] ?? -1, nccBest(area, t.data));
    const order = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const top = order[0], second = order[1];
    const ok = top && scores[top] >= minScore && (!second || scores[top] - scores[second] >= MIN_GAP);
    return { id: ok ? top : null, score: top ? scores[top] : -1, scores };
  }

  // Which business a card is: best title template, or null when unsure.
  function identify(img, card, templates) {
    return best(titleArea(img, card), decode(templates, 'titles'), MIN_TITLE);
  }

  // Master Control Terminal: [{ id, stock (0..1), supplies (0..1|null) }]; empty when not on screen.
  function readMct(img, templates) {
    const cards = findCards(img);
    // The MCT has at least two cards side by side with the same bar size; a lone bar is something else.
    const sized = cards.filter(c => cards.some(o => o !== c && Math.abs(o.width - c.width) <= c.width * 0.03));
    const out = [];
    for (const c of sized) {
      const who = identify(img, c, templates);
      if (who.id && !out.some(o => o.id === who.id)) out.push({ id: who.id, stock: round(c.stock), supplies: c.supplies == null ? null : round(c.supplies) });
    }
    return out;
  }

  // ---------- Nightclub: "Sell Goods" page of the nightclub computer ----------
  // Seven tiles with a thin lilac border, each with the good's name and "units/capacity".
  const TILE = { canon: 200, ratio: 0.207, name: { x0: 0.02, x1: 0.72, y0: 0.1, y1: 0.56, margin: 4 }, count: { x0: 0.7, x1: 0.985, y0: 0.08, y1: 0.58 } };
  const GLYPH = { w: 10, h: 16 };
  const MIN_NAME = 0.6;
  const MIN_GLYPH = 0.55;
  const MIN_GLYPH_HEIGHT = 13; // px; the count is about 17 px tall on a 1080p screen
  const isBorder = (r, g, b) => b >= 95 && b - g >= 50 && r - g >= 20 && r <= 200 && g <= 150;

  // Tile rectangles: long horizontal border lines that repeat at the same x range (one column of
  // tiles), paired top/bottom by the tile height. A bottom line hidden by the pointer is inferred.
  function findTiles(img) {
    const { data, width, height } = img, ch = img.channels || 3;
    const minLen = Math.round(height * 0.25);
    const lines = [];
    for (let y = 0; y < height; y++) {
      let x0 = -1, last = -1, gap = 0;
      for (let x = 0; x <= width; x++) {
        const i = (y * width + x) * ch;
        if (x < width && isBorder(data[i], data[i + 1], data[i + 2])) { if (x0 < 0) x0 = x; last = x; gap = 0; } else if (x0 >= 0 && ++gap > 2) {
          if (last - x0 + 1 >= minLen) lines.push({ y, x0, x1: last });
          x0 = -1;
        }
      }
    }
    let cols = [];
    for (const l of lines) {
      const c = cols.find(o => Math.abs(o.x0 - l.x0) <= 3 && Math.abs(o.x1 - l.x1) <= 3);
      if (c) c.lines.push(l); else cols.push({ x0: l.x0, x1: l.x1, lines: [l] });
    }
    const rows = list => {
      const ys = [];
      for (const y of list.map(l => l.y).sort((a, b) => a - b)) if (!ys.length || y - ys[ys.length - 1] > 2) ys.push(y);
      return ys;
    };
    // A line that runs into a light beam on the left still belongs to its column.
    const real = cols.filter(c => rows(c.lines).length >= 2);
    for (const c of cols.filter(o => !real.includes(o))) {
      const to = real.find(o => Math.abs(o.x1 - c.x1) <= 3 && c.x0 < o.x0 && o.x0 - c.x0 <= (o.x1 - o.x0) * 0.15);
      if (to) to.lines.push(...c.lines);
    }
    cols = real.map(c => ({ x0: c.x0, x1: c.x1, ys: rows(c.lines) }));
    const tiles = [];
    for (const c of cols) {
      const w = c.x1 - c.x0 + 1;
      const diffs = c.ys.slice(1).map((y, i) => y - c.ys[i]).filter(d => d >= w * 0.12 && d <= w * 0.35);
      if (!diffs.length) continue;
      const h = median(diffs);
      for (let i = 0; i < c.ys.length; i++) {
        const y = c.ys[i], next = c.ys[i + 1];
        if (next !== undefined && Math.abs(next - y - h) <= 3) { tiles.push({ x: c.x0, y, w, h }); i++; } else if (next === undefined || next - y > h) tiles.push({ x: c.x0, y, w, h });
      }
    }
    return tiles.filter(t => t.y + t.h < height);
  }

  // Name band of a tile at canonical scale, with margins for the search.
  function nameArea(img, tile) {
    const k = tile.w / TILE.canon, n = TILE.name;
    const tw = Math.round((n.x1 - n.x0) * TILE.canon), th = Math.round((n.y1 - n.y0) * TILE.ratio * TILE.canon);
    const m = n.margin, w = tw + 2 * m, h = th + 2 * m;
    return { data: sample(img, tile.x + n.x0 * tile.w - m * k, tile.y + n.y0 * tile.h - m * k, w, h, k), width: w, height: h, tw, th, mx: m, my: m };
  }

  function nameTemplate(img, tile) {
    const a = nameArea(img, tile);
    const out = new Uint8Array(a.tw * a.th);
    for (let y = 0; y < a.th; y++) for (let x = 0; x < a.tw; x++) out[y * a.tw + x] = Math.round(a.data[(y + a.my) * a.width + x + a.mx]);
    return out;
  }

  // Characters (bright pixels) in a box, split at empty columns: [{ x0, x1, y0, y1, mask }].
  function glyphs(img, box, isInk) {
    const ch = img.channels || 3;
    const X0 = Math.max(0, Math.round(box.x0)), X1 = Math.min(img.width - 1, Math.round(box.x1));
    const Y0 = Math.max(0, Math.round(box.y0)), Y1 = Math.min(img.height - 1, Math.round(box.y1));
    const w = X1 - X0 + 1, h = Y1 - Y0 + 1;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((Y0 + y) * img.width + X0 + x) * ch;
        mask[y * w + x] = isInk(img.data[i], img.data[i + 1], img.data[i + 2]) ? 1 : 0;
      }
    }
    const colOn = x => { for (let y = 0; y < h; y++) if (mask[y * w + x]) return true; return false; };
    const out = [];
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && colOn(x);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        let y0 = h, y1 = -1;
        for (let y = 0; y < h; y++) for (let xx = start; xx < x; xx++) if (mask[y * w + xx]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        out.push({ x0: start, x1: x - 1, y0, y1, w, mask });
        start = -1;
      }
    }
    return out;
  }

  // A glyph resampled to GLYPH.w x GLYPH.h (ink coverage 0..255) plus its width/height ratio.
  function glyphShape(g) {
    const gw = g.x1 - g.x0 + 1, gh = g.y1 - g.y0 + 1;
    const data = new Uint8Array(GLYPH.w * GLYPH.h);
    for (let y = 0; y < GLYPH.h; y++) {
      for (let x = 0; x < GLYPH.w; x++) {
        // Box filter over the source pixels this cell covers.
        const sx0 = g.x0 + (x * gw) / GLYPH.w, sx1 = g.x0 + ((x + 1) * gw) / GLYPH.w;
        const sy0 = g.y0 + (y * gh) / GLYPH.h, sy1 = g.y0 + ((y + 1) * gh) / GLYPH.h;
        let sum = 0, n = 0;
        for (let yy = Math.floor(sy0); yy < Math.max(Math.floor(sy0) + 1, Math.ceil(sy1)); yy++) {
          for (let xx = Math.floor(sx0); xx < Math.max(Math.floor(sx0) + 1, Math.ceil(sx1)); xx++) { sum += g.mask[yy * g.w + xx]; n++; }
        }
        data[y * GLYPH.w + x] = Math.round((255 * sum) / n);
      }
    }
    return { data, aspect: gw / gh, height: gh };
  }

  function nccPlain(a, b) {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { const p = a[i] - ma, q = b[i] - mb; num += p * q; da += p * p; db += q * q; }
    return da && db ? num / Math.sqrt(da * db) : (da === db ? 1 : 0);
  }

  // Best character for a glyph: shape correlation minus a penalty for a different width/height
  // ratio, with a margin over the next best character.
  function readGlyph(shape, list) {
    const scores = {};
    for (const t of list) {
      const s = nccPlain(shape.data, t.data) - 1.5 * Math.abs(shape.aspect - t.aspect);
      scores[t.id] = Math.max(scores[t.id] ?? -Infinity, s);
    }
    const order = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const top = order[0], next = order[1];
    return scores[top] >= MIN_GLYPH && (!next || scores[top] - scores[next] >= 0.05) ? top : null;
  }

  // "8/50" in the top right of a tile: { units, max } or null.
  function readCount(img, tile, templates) {
    const c = TILE.count;
    const box = { x0: tile.x + c.x0 * tile.w, x1: tile.x + c.x1 * tile.w, y0: tile.y + c.y0 * tile.h, y1: tile.y + c.y1 * tile.h };
    const gs = glyphs(img, box, (r, g, b) => Math.min(r, g, b) >= 120);
    const tall = gs.length ? Math.max(...gs.map(g => g.y1 - g.y0 + 1)) : 0;
    if (tall < MIN_GLYPH_HEIGHT) return null; // too small to tell 6 from 8
    let text = '';
    for (const g of gs) {
      if (g.y1 - g.y0 + 1 < tall * 0.6) return null; // a dot or noise: not the count
      const ch = readGlyph(glyphShape(g), decode(templates, 'glyphs'));
      if (ch === null) return null;
      text += ch;
    }
    const m = /^(\d{1,3})\/(\d{1,3})$/.exec(text);
    if (!m) return null;
    const units = Number(m[1]), max = Number(m[2]);
    return max > 0 && units <= max ? { units, max } : null;
  }

  // Nightclub "Sell Goods": [{ id, units, max }] for the goods read; empty when not on screen.
  function readNightclub(img, templates) {
    const tiles = findTiles(img);
    if (tiles.length < 3) return [];
    const names = decode(templates, 'goods');
    const out = [];
    for (const t of tiles) {
      const who = best(nameArea(img, t), names, MIN_NAME);
      if (!who.id || out.some(o => o.id === who.id)) continue;
      const count = readCount(img, t, templates);
      if (count) out.push({ id: who.id, ...count });
    }
    return out;
  }

  // Cheap check on a small screenshot: is the "Sell Goods" page there? (its counts need a bigger one)
  function seesNightclub(img, templates) {
    const tiles = findTiles(img);
    if (tiles.length < 3) return false;
    const names = decode(templates, 'goods');
    let found = 0;
    for (const t of tiles) if (best(nameArea(img, t), names, MIN_NAME).id) found++;
    return found >= 3;
  }

  // Small screenshot (about 540 px tall) taken every couple of seconds: the MCT is read at once;
  // the Nightclub page only answers { screen: 'nightclub', goods: null } so a big one is taken.
  function probe(img, templates) {
    const cards = readMct(img, templates);
    if (cards.length) return { screen: 'mct', cards };
    return seesNightclub(img, templates) ? { screen: 'nightclub', goods: null } : null;
  }

  // img: color screenshot { data, width, height, channels (3|4) }, 720 to 1440 px tall.
  // Returns what is on screen: { screen: 'mct', cards } | { screen: 'nightclub', goods } | null.
  function read(img, templates) {
    const cards = readMct(img, templates);
    if (cards.length) return { screen: 'mct', cards };
    const goods = readNightclub(img, templates);
    if (goods.length) return { screen: 'nightclub', goods };
    return null;
  }

  const round = v => Math.round(v * 1000) / 1000;
  function median(a) {
    const s = [...a].sort((p, q) => p - q);
    return s[Math.floor(s.length / 2)];
  }

  return { TITLE, CANON, GLYPH, findBars, findCards, identify, titleTemplate, readMct, findTiles, nameTemplate, glyphs, glyphShape, readCount, readNightclub, probe, read };
});
