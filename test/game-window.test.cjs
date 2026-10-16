const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRect } = require('../game-window.cjs');

test('lê o retângulo da janela do jogo', () => {
  assert.deepEqual(parseRect('100 50 1920 1080\r'), { x: 100, y: 50, width: 1920, height: 1080 });
  assert.deepEqual(parseRect('-1920 0 1280 720'), { x: -1920, y: 0, width: 1280, height: 720 });
  assert.equal(parseRect('none'), null);
  assert.equal(parseRect('0 0 0 0'), null);
  assert.equal(parseRect('10 10 abc 20'), null);
});
