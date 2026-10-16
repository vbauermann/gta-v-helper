const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { analyze, tileRect } = require('../lib/fp-match.js');

function load(name) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name)));
  const nl = buf.indexOf(10);
  const [, width, height] = buf.subarray(0, nl).toString().split(' ').map(Number);
  return { data: buf.subarray(nl + 1), width, height };
}

// Vitor's in-game screenshots (3440x1440, scaled to 360 px tall); tiles are numbered row by row.
const CASES = { 1: [0, 1, 3, 4], 2: [2, 3, 4, 6], 3: [0, 1, 2, 3], 4: [1, 3, 5, 6], 5: [2, 3, 4, 7] };

test('acha as 4 peças certas nos prints do hack', () => {
  for (const [n, picks] of Object.entries(CASES)) {
    const r = analyze(load(`hack-${n}.pgm.gz`));
    assert.equal(r.found, true, `print ${n}`);
    assert.deepEqual(r.picks, picks, `print ${n}`);
  }
});

test('não marca nada fora do hack', () => {
  assert.equal(analyze(load('not-hack.pgm.gz')).found, false);
  const width = 640, height = 360, data = new Uint8Array(width * height);
  let seed = 7;
  for (let i = 0; i < data.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; data[i] = seed & 255; }
  assert.equal(analyze({ data, width, height }).found, false);
  assert.equal(analyze({ data: new Uint8Array(width * height), width, height }).found, false);
});

test('posição das peças acompanha a altura da tela', () => {
  const r = tileRect(0, 3440, 1440);
  assert.ok(Math.abs(r.x - 1070) < 2 && Math.abs(r.y - 358) < 2 && Math.abs(r.width - 162) < 2);
  const last = tileRect(7, 3440, 1440);
  assert.ok(Math.abs(last.x - 1262) < 2 && Math.abs(last.y - 934) < 2);
});

test('modo janela: acha o hack dentro da área da janela do jogo numa tela maior', () => {
  const { region } = require('../lib/fp-match.js');
  const win = load('hack-1.pgm.gz');
  // Paste the "game window" into a bright desktop at an offset.
  const screen = { width: win.width + 300, height: win.height + 200, data: new Uint8Array((win.width + 300) * (win.height + 200)).fill(200) };
  for (let y = 0; y < win.height; y++) screen.data.set(win.data.subarray(y * win.width, (y + 1) * win.width), (y + 120) * screen.width + 170);
  assert.equal(analyze(screen).found, false, 'a tela inteira não bate com a geometria de tela cheia');
  const r = analyze(region(screen, { x: 170, y: 120, width: win.width, height: win.height }));
  assert.deepEqual(r.picks, [0, 1, 3, 4]);
});
