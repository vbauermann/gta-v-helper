const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

// wiki-feed.cjs needs electron's net only when fetching; stub it for the pure helpers.
const load = Module._load;
Module._load = (req, ...rest) => (req === 'electron' ? { net: {} } : load(req, ...rest));
const { validWiki, newer } = require('../wiki-feed.cjs');
Module._load = load;
const bundled = require('../data/wiki.json');
const clone = v => JSON.parse(JSON.stringify(v));

test('the bundled wiki is valid and covers the heist pages', () => {
  assert.ok(validWiki(bundled));
  for (const id of ['fleeca', 'casino', 'cayo', 'prison', 'humane', 'seriesa', 'pacific', 'doomsday', 'kortz']) assert.ok(bundled.heists[id], id);
});

test('every setup has a GTA Wiki source and steps', () => {
  for (const heist of Object.values(bundled.heists)) {
    for (const s of heist.setups) {
      assert.match(s.source || '', /^https:\/\/gta\.fandom\.com\/wiki\//, `${heist.id}/${s.id}`);
      assert.ok(s.steps.length >= 2, `${heist.id}/${s.id} steps`);
    }
  }
});

test('rejects broken wikis', () => {
  assert.ok(!validWiki(null));
  const noSetups = clone(bundled);
  noSetups.heists.fleeca.setups = [];
  assert.ok(!validWiki(noSetups));
  const badLink = clone(bundled);
  badLink.heists.fleeca.source = 'https://example.com/x';
  assert.ok(!validWiki(badLink));
  const dup = clone(bundled);
  dup.heists.fleeca.setups.push(dup.heists.fleeca.setups[0]);
  assert.ok(!validWiki(dup));
  const badSection = clone(bundled);
  badSection.heists.cayo.setups[0].section = 'nope';
  assert.ok(!validWiki(badSection));
  const badApproach = clone(bundled);
  badApproach.heists.casino.setups[0].approaches = ['nope'];
  assert.ok(!validWiki(badApproach));
});

test('a newer version replaces the bundled one, an older one does not', () => {
  const next = { ...clone(bundled), version: '2999-01-01' };
  assert.strictEqual(newer(bundled, next), next);
  assert.strictEqual(newer(bundled, { ...clone(bundled), version: '2000-01-01' }), bundled);
  assert.strictEqual(newer(bundled, { version: '2999-01-01', heists: {} }), bundled);
});
