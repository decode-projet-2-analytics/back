// decode-project-2-analytics-back/lib/socket/analytics/schedule-widget-recalc.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createRecalcScheduler } = require('./schedule-widget-recalc');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createRecalcScheduler', () => {
    it('coalesces multiple schedules for the same widget into one push', async () => {
        const pushed = [];
        const scheduler = createRecalcScheduler({
            delayMs: 20,
            push: async (widget) => { pushed.push(widget.id); },
        });

        scheduler.schedule({ id: 7, updatedAt: 'a' });
        scheduler.schedule({ id: 7, updatedAt: 'b' });
        scheduler.schedule({ id: 7, updatedAt: 'c' });

        await wait(50);

        assert.deepEqual(pushed, [7]);
    });

    it('pushes distinct widgets independently', async () => {
        const pushed = [];
        const scheduler = createRecalcScheduler({
            delayMs: 20,
            push: async (widget) => { pushed.push(widget.id); },
        });

        scheduler.schedule({ id: 1 });
        scheduler.schedule({ id: 2 });

        await wait(50);

        assert.deepEqual(pushed.sort(), [1, 2]);
    });

    it('uses the latest widget object for the fire', async () => {
        const seen = [];
        const scheduler = createRecalcScheduler({
            delayMs: 20,
            push: async (widget) => { seen.push(widget.updatedAt); },
        });

        scheduler.schedule({ id: 5, updatedAt: 'old' });
        scheduler.schedule({ id: 5, updatedAt: 'new' });

        await wait(50);

        assert.deepEqual(seen, ['new']);
    });

    it('does not throw when push rejects', async () => {
        const scheduler = createRecalcScheduler({
            delayMs: 10,
            push: async () => { throw new Error('boom'); },
        });

        scheduler.schedule({ id: 9 });
        await wait(40);
        // Reaching here without an unhandled rejection crashing the test is success.
        assert.ok(true);
    });
});
