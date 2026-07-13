const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildMetadataMatch } = require('./metadata-match');

describe('buildMetadataMatch', () => {
  it('maps eq to equality on metadata.key', () => {
    assert.deepEqual(
      buildMetadataMatch([{ key: 'browser', op: 'eq', value: 'chrome' }]),
      { 'metadata.browser': 'chrome' },
    );
  });

  it('maps gt with numeric coercion', () => {
    assert.deepEqual(
      buildMetadataMatch([{ key: 'loadMs', op: 'gt', value: 100 }]),
      { 'metadata.loadMs': { $gt: 100 } },
    );
  });

  it('maps exists', () => {
    assert.deepEqual(
      buildMetadataMatch([{ key: 'plan', op: 'exists', value: true }]),
      { 'metadata.plan': { $exists: true } },
    );
  });

  it('AND-merges multiple filters', () => {
    const m = buildMetadataMatch([
      { key: 'browser', op: 'eq', value: 'chrome' },
      { key: 'loadMs', op: 'lt', value: 3000 },
    ]);
    assert.equal(m['metadata.browser'], 'chrome');
    assert.deepEqual(m['metadata.loadMs'], { $lt: 3000 });
  });
});
