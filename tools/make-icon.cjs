// Renders the app logo (Nexo's gradient tile with a GTA-style serif V) into assets/icon.png,
// assets/icon.ico and assets/tray.png. Same drawing as the 'logo' entry in app/icons.js.
// Adapted from vbauermann/nexo scripts/make-icons.mjs; no image dependencies.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const STOPS = [
  [0, [0x7f, 0x93, 0xff]],
  [0.55, [0x9b, 0x7c, 0xff]],
  [1, [0xc7, 0x6b, 0xf2]]
];
// The V, in the 32x32 design grid: thick left arm, thin right arm, flat serifs on top.
const V = [[7, 8], [14.2, 8], [14.2, 9.4], [12.8, 9.4], [17.3, 19.6], [21.4, 9.4], [19.8, 9.4], [19.8, 8], [25, 8],
  [25, 9.4], [23.6, 9.4], [16.6, 25], [15.2, 25], [8.6, 9.4], [7, 9.4]];

function gradient(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
  }
  return STOPS[STOPS.length - 1][1];
}

function inside(poly, u, v) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Colour of the logo at (u, v) in a 32x32 design grid, or null outside the tile. */
function sample(u, v) {
  const qx = Math.abs(u - 16) - 6;
  const qy = Math.abs(v - 16) - 6;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 9;
  if (outside > 0) return null;
  if (inside(V, u, v)) return [255, 255, 255];
  return gradient((u - 1 + (v - 1)) / 60);
}

function render(size) {
  const ss = size <= 32 ? 6 : 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sample(((x + (sx + 0.5) / ss) / size) * 32, ((y + (sy + 0.5) / ss) / size) * 32);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; n++;
        }
      }
      const o = (y * size + x) * 4;
      if (n) {
        px[o] = Math.round(r / n);
        px[o + 1] = Math.round(g / n);
        px[o + 2] = Math.round(b / n);
        px[o + 3] = Math.round((n / (ss * ss)) * 255);
      }
    }
  }
  return px;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const px = render(size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function ico(sizes) {
  const images = sizes.map(png);
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + i * 16;
    head[e] = s >= 256 ? 0 : s;
    head[e + 1] = s >= 256 ? 0 : s;
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(images[i].length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  return Buffer.concat([head, ...images]);
}

const out = path.join(__dirname, '../assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png(512));
fs.writeFileSync(path.join(out, 'icon.ico'), ico([16, 20, 24, 32, 40, 48, 64, 128, 256]));
fs.writeFileSync(path.join(out, 'tray.png'), png(32));
console.log('ícones gerados em', out);
