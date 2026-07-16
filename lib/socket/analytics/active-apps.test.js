// decode-project-2-analytics-back/lib/socket/analytics/active-apps.test.js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const activeApps = require('./active-apps');

describe('active-apps', () => {
    beforeEach(() => {
        // Reset shared state between tests.
        activeApps.remove(1);
        activeApps.remove(1);
        activeApps.remove(2);
    });

    it('has() is false for unknown apps', () => {
        assert.equal(activeApps.has(999), false);
        assert.equal(activeApps.count(999), 0);
    });

    it('add() then has() is true', () => {
        activeApps.add(1);
        assert.equal(activeApps.has(1), true);
        assert.equal(activeApps.count(1), 1);
    });

    it('ref-counts multiple subscribers', () => {
        activeApps.add(1);
        activeApps.add(1);
        assert.equal(activeApps.count(1), 2);
        activeApps.remove(1);
        assert.equal(activeApps.has(1), true);
        activeApps.remove(1);
        assert.equal(activeApps.has(1), false);
    });

    it('remove() never goes negative', () => {
        activeApps.remove(2);
        assert.equal(activeApps.count(2), 0);
        activeApps.add(2);
        assert.equal(activeApps.count(2), 1);
    });
});
