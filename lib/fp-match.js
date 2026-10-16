// Finds which of the 8 component tiles of the Casino fingerprint hack belong to the big "Clone
// target" print. Works only on a grayscale screenshot: each right tile is literally a crop of the
// target, so it gets a high normalized cross-correlation somewhere on it; decoys don't.
// The hack UI is centered and scales with the screen height, so the geometry is relative to the
// height (measured on 3440x1440 screenshots). UMD: used by the capture worker and the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtaFpMatch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Units of screen height; x is measured from the horizontal center of the screen.
  const GEOMETRY = {
    tile: { x: -0.45139, y: 0.24861, size: 0.1125, pitchX: 0.13333, pitchY: 0.13333, inset: 0.011 },
    target: { x0: -0.0597, x1: 0.40625, y0: 0.13125, y1: 0.66875 }
  };
  const SCALES = [1.2, 1.25, 1.3, 1.35, 1.4]; // target features are ~1.3x bigger than the tiles
  const MIN_SCORE = 0.72; // 4th best tile
  const MIN_GAP = 0.12; // 4th best minus 5th best

  // Pixel rectangle of tile i (0..7, row-major, 2 columns) on a screen of width x height.
  function tileRect(i, width, height) {
    const g = GEOMETRY.tile;
    const col = i % 2, row = Math.floor(i / 2);
    const x = width / 2 + (g.x + col * g.pitchX) * height;
    const y = (g.y + row * g.pitchY) * height;
    return { x, y, width: g.size * height, height: g.size * height };
  }

  // Part of a grayscale image (any rectangle, clamped to the image), as a Uint8Array image.
  // Windowed mode: the game window's area of the screenshot.
  function region(img, area) {
    const x0 = Math.max(0, Math.round(area.x)), y0 = Math.max(0, Math.round(area.y));
    const x1 = Math.min(img.width, Math.round(area.x + area.width)), y1 = Math.min(img.height, Math.round(area.y + area.height));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const data = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) data.set(img.data.subarray((y0 + y) * img.width + x0, (y0 + y) * img.width + x0 + w), y * w);
    return { data, width: w, height: h };
  }

  function crop(img, x0, y0, x1, y1) {
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(img.width, Math.round(x1)); y1 = Math.min(img.height, Math.round(y1));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const data = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = (y0 + y) * img.width + x0;
      for (let x = 0; x < w; x++) data[y * w + x] = img.data[row + x];
    }
    return { data, width: w, height: h };
  }

  function half(img) {
    const w = Math.floor(img.width / 2), h = Math.floor(img.height / 2);
    const data = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 2 * y * img.width + 2 * x;
        data[y * w + x] = (img.data[i] + img.data[i + 1] + img.data[i + img.width] + img.data[i + img.width + 1]) / 4;
      }
    }
    return { data, width: w, height: h };
  }

  // Bilinear resize by factor k.
  function resize(img, k) {
    const w = Math.max(2, Math.round(img.width * k)), h = Math.max(2, Math.round(img.height * k));
    const data = new Float32Array(w * h);
    const sx = (img.width - 1) / (w - 1), sy = (img.height - 1) / (h - 1);
    for (let y = 0; y < h; y++) {
      const fy = y * sy, y0 = Math.floor(fy), y1 = Math.min(img.height - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = x * sx, x0 = Math.floor(fx), x1 = Math.min(img.width - 1, x0 + 1), tx = fx - x0;
        const a = img.data[y0 * img.width + x0], b = img.data[y0 * img.width + x1];
        const c = img.data[y1 * img.width + x0], d = img.data[y1 * img.width + x1];
        data[y * w + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
      }
    }
    return { data, width: w, height: h };
  }

  // Integral images of a target, for O(1) window mean and variance.
  function integrals(img) {
    const w = img.width + 1, h = img.height + 1;
    const s = new Float64Array(w * h), q = new Float64Array(w * h);
    for (let y = 1; y < h; y++) {
      let rs = 0, rq = 0;
      for (let x = 1; x < w; x++) {
        const v = img.data[(y - 1) * img.width + x - 1];
        rs += v; rq += v * v;
        s[y * w + x] = s[(y - 1) * w + x] + rs;
        q[y * w + x] = q[(y - 1) * w + x] + rq;
      }
    }
    return { img, s, q, w };
  }

  // Best NCC of template t over target T, optionally only around (cx, cy) +- radius.
  function ncc(T, t, around) {
    const n = t.width * t.height;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += t.data[i];
    mean /= n;
    const z = new Float32Array(n);
    let tn = 0;
    for (let i = 0; i < n; i++) { z[i] = t.data[i] - mean; tn += z[i] * z[i]; }
    tn = Math.sqrt(tn) + 1e-6;
    const maxX = T.img.width - t.width, maxY = T.img.height - t.height;
    let x0 = 0, x1 = maxX, y0 = 0, y1 = maxY;
    if (around) {
      x0 = Math.max(0, around.x - around.r); x1 = Math.min(maxX, around.x + around.r);
      y0 = Math.max(0, around.y - around.r); y1 = Math.min(maxY, around.y + around.r);
    }
    const best = { score: -1, x: 0, y: 0 };
    const W = T.w, D = T.img.data, tw = t.width;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const a = y * W + x, b = y * W + x + tw, c = (y + t.height) * W + x, d = (y + t.height) * W + x + tw;
        const sum = T.s[d] - T.s[b] - T.s[c] + T.s[a];
        const sq = T.q[d] - T.q[b] - T.q[c] + T.q[a];
        const varW = sq - (sum * sum) / n;
        if (varW <= 1e-3) continue;
        let num = 0;
        for (let ty = 0; ty < t.height; ty++) {
          const row = (y + ty) * T.img.width + x, trow = ty * tw;
          for (let tx = 0; tx < tw; tx++) num += D[row + tx] * z[trow + tx];
        }
        const r = num / (Math.sqrt(varW) * tn);
        if (r > best.score) { best.score = r; best.x = x; best.y = y; }
      }
    }
    return best;
  }

  function stats(img) {
    let s = 0, q = 0;
    for (let i = 0; i < img.data.length; i++) { s += img.data[i]; q += img.data[i] * img.data[i]; }
    const mean = s / img.data.length;
    return { mean, std: Math.sqrt(Math.max(0, q / img.data.length - mean * mean)) };
  }
  // The hack is dark with thin light ridges; anything else (menus, the map, a desktop) fails here
  // before the costlier matching. Selected pieces turn white, hence the loose tile limits.
  const looksLikeHack = (st, maxMean) => st.mean <= maxMean && st.std >= 10;

  // img: { data: grayscale Uint8Array|Float32Array, width, height } of the whole screen, any size
  // (around 360 px tall is the sweet spot). Returns the score of each tile and, when the hack is
  // on screen, the 4 right tiles (indexes 0..7).
  function analyze(img) {
    const H = img.height, g = GEOMETRY;
    const cx = img.width / 2;
    const target = crop(img, cx + g.target.x0 * H, g.target.y0 * H, cx + g.target.x1 * H, g.target.y1 * H);
    const none = { found: false, picks: [], scores: [] };
    if (!looksLikeHack(stats(target), 60)) return none;
    const inset = g.tile.inset * H;
    const tiles = [];
    for (let i = 0; i < 8; i++) {
      const r = tileRect(i, img.width, H);
      const tile = crop(img, r.x + inset, r.y + inset, r.x + r.width - inset, r.y + r.height - inset);
      if (!looksLikeHack(stats(tile), 110)) return none;
      tiles.push(tile);
    }
    const TA = integrals(target), TB = integrals(half(target));
    const scores = [];
    for (const tile of tiles) {
      const small = half(tile);
      let coarse = { score: -1 }, k = SCALES[0];
      for (const s of SCALES) {
        const m = ncc(TB, resize(small, s));
        if (m.score > coarse.score) { coarse = m; k = s; }
      }
      let fine = { score: -1 };
      for (const s of [k - 0.025, k, k + 0.025]) {
        const m = ncc(TA, resize(tile, s), { x: coarse.x * 2, y: coarse.y * 2, r: 4 });
        if (m.score > fine.score) fine = m;
      }
      scores.push(Math.max(fine.score, coarse.score));
    }
    const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
    const fourth = scores[order[3]], fifth = scores[order[4]];
    const found = fourth >= MIN_SCORE && fourth - fifth >= MIN_GAP;
    return { found, picks: found ? order.slice(0, 4).sort((a, b) => a - b) : [], scores };
  }

  return { GEOMETRY, tileRect, analyze, region };
});
