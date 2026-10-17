// Every version shipped must have its release notes (docs/adr/0013-release-notes.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const { version } = require('../package.json');
const { versions } = require('../data/release-notes.json');

const parse = v => v.split('.').map(Number);
const newer = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

test('a versão do package.json tem release notes no topo da lista', () => {
  assert.equal(versions[0].version, version, `adicione as notas da ${version} no topo de data/release-notes.json`);
});

test('as release notes estão completas e em ordem da mais nova para a mais antiga', () => {
  for (const [i, r] of versions.entries()) {
    assert.match(r.version, /^\d+\.\d+\.\d+$/);
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.title && r.title.length <= 60, `título da ${r.version}`);
    assert.ok(Array.isArray(r.items) && r.items.length && r.items.every(t => typeof t === 'string' && t.length), `itens da ${r.version}`);
    if (i) assert.ok(newer(versions[i - 1].version, r.version), `${versions[i - 1].version} deve vir antes de ${r.version}`);
  }
});
