const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTimeRange } = require('./time-range');

describe('resolveTimeRange', () => {
    const NOW = new Date('2026-07-12T22:00:00.000Z').getTime();
    let realNow;

    before(() => {
        realNow = Date.now;
        Date.now = () => NOW;
    });

    after(() => {
        Date.now = realNow;
    });

    it('uses preset as a sliding window ending now', () => {
        const { from, to } = resolveTimeRange({ preset: '24h', step: '1h' });
        assert.equal(to.getTime(), NOW);
        assert.equal(from.getTime(), NOW - 24 * 60 * 60 * 1000);
    });

    it('reinterprets frozen from/to as a duration from now', () => {
        const { from, to } = resolveTimeRange({
            from: '2026-07-10T21:00:00.000Z',
            to: '2026-07-12T21:00:00.000Z',
            step: '1h',
        });
        assert.equal(to.getTime(), NOW);
        assert.equal(from.getTime(), NOW - 2 * 24 * 60 * 60 * 1000);
    });

    it('keeps open-ended from and uses now as to', () => {
        const { from, to } = resolveTimeRange({
            from: '2026-07-10T22:00:00.000Z',
            to: null,
            step: '1h',
        });
        assert.equal(to.getTime(), NOW);
        assert.equal(from.toISOString(), '2026-07-10T22:00:00.000Z');
    });

    it('defaults to last 24h when empty', () => {
        const { from, to } = resolveTimeRange({});
        assert.equal(to.getTime(), NOW);
        assert.equal(from.getTime(), NOW - 24 * 60 * 60 * 1000);
    });
});
