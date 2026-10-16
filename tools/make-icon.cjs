// Generates assets/icon.png and assets/icon.ico (a green "timer" badge) without image dependencies.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const rows = [];
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c, d = Math.hypot(dx, dy) / (size / 2);
      const angle = Math.atan2(dx, -dy); // 0 at 12 o'clock, clockwise
      let rgba = [0, 0, 0, 0];
      if (d <= 0.98) rgba = [20, 24, 33, 255];
      if (d > 0.78 && d <= 0.98 && (angle >= -Math.PI / 2 || angle < -Math.PI)) rgba = [61, 220, 132, 255];
      if (d > 0.78 && d <= 0.98 && angle < -Math.PI / 2) rgba = [74, 163, 255, 255];
      const hand = (Math.abs(dx) < size * 0.05 && dy < 0 && d < 0.6) || (Math.abs(dy) < size * 0.05 && dx > 0 && d < 0.45);
      if (hand || d < 0.1) rgba = [232, 235, 242, 255];
      row.push(...rgba);
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))
  ]);
}

const out = path.join(__dirname, '../assets');
fs.mkdirSync(out, { recursive: true });
const big = png(256);
fs.writeFileSync(path.join(out, 'icon.png'), png(64));
// ICO with a single embedded 256px PNG (supported since Windows Vista).
const header = Buffer.from([0, 0, 1, 0, 1, 0]);
const entry = Buffer.alloc(16);
entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0;
entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(big.length, 8); entry.writeUInt32LE(22, 12);
fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, entry, big]));
console.log('ícones gerados em', out);
