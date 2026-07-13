const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildDropOff,
    buildConversionRate,
    buildFunnelPayload,
} = require('./funnel');

describe('buildConversionRate', () => {
    it('returns last/first', () => {
        assert.equal(buildConversionRate(1200, 310), 310 / 1200);
    });

    it('returns 0 when first is 0', () => {
        assert.equal(buildConversionRate(0, 10), 0);
    });
});

describe('buildDropOff', () => {
    it('computes lost and rate between consecutive steps', () => {
        const dropOff = buildDropOff([
            { index: 0, count: 100 },
            { index: 1, count: 40 },
            { index: 2, count: 10 },
        ]);
        assert.deepEqual(dropOff, [
            { fromIndex: 0, toIndex: 1, lost: 60, rate: 0.6 },
            { fromIndex: 1, toIndex: 2, lost: 30, rate: 0.75 },
        ]);
    });

    it('uses rate 0 when from count is 0', () => {
        const dropOff = buildDropOff([
            { index: 0, count: 0 },
            { index: 1, count: 0 },
        ]);
        assert.deepEqual(dropOff, [
            { fromIndex: 0, toIndex: 1, lost: 0, rate: 0 },
        ]);
    });
});

describe('buildFunnelPayload', () => {
    it('assembles steps, conversion, dropOff', () => {
        const payload = buildFunnelPayload({
            tunnelId: 12,
            tunnelName: 'Checkout',
            steps: [
                { index: 0, tagId: 3, slug: 'view_cart', label: 'Cart', count: 100 },
                { index: 1, tagId: 8, slug: 'pay', label: 'Pay', count: 40 },
            ],
        });
        assert.equal(payload.metric, 'count');
        assert.equal(payload.conversionRate, 0.4);
        assert.equal(payload.dropOff.length, 1);
        assert.equal(payload.steps.length, 2);
    });
});
