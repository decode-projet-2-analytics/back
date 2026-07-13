const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildEventsSeriesMatch,
    buildEventsValue,
    normalizeEventsMetric,
    normalizeEventsSeries,
} = require('./events-kpi');

describe('normalizeEventsSeries', () => {
    it('defaults to one all-events series', () => {
        assert.deepEqual(normalizeEventsSeries(), [{ name: 'All', filters: [] }]);
    });
});

describe('normalizeEventsMetric', () => {
    it('maps legacy rate and share to count', () => {
        assert.equal(normalizeEventsMetric('rate'), 'count');
        assert.equal(normalizeEventsMetric('share'), 'count');
    });

    it('keeps sessions', () => {
        assert.equal(normalizeEventsMetric('sessions'), 'sessions');
    });
});

describe('buildEventsSeriesMatch', () => {
    const NOW = new Date('2026-07-12T22:00:00.000Z').getTime();
    let realNow;

    before(() => {
        realNow = Date.now;
        Date.now = () => NOW;
    });

    after(() => {
        Date.now = realNow;
    });

    it('matches event type, widget scope, tag, time range, and metadata filters', () => {
        const widget = {
            applicationId: 7,
            config: {
                tagId: '12',
                timeRange: {
                    // 2h frozen window → sliding last 2h from mocked now
                    from: '2026-07-12T10:00:00.000Z',
                    to: '2026-07-12T12:00:00.000Z',
                },
            },
        };

        const match = buildEventsSeriesMatch(widget, {
            filters: [{ key: 'browser', op: 'eq', value: 'firefox' }],
        });

        assert.deepEqual(match, {
            applicationId: 7,
            type: 'event',
            tagId: 12,
            createdAt: {
                $gte: new Date(NOW - 2 * 60 * 60 * 1000),
                $lte: new Date(NOW),
            },
            'metadata.browser': 'firefox',
        });
    });

    it('throws a 400 when config.tagId is missing', () => {
        assert.throws(
            () => buildEventsSeriesMatch({ applicationId: 7, config: {} }, {}),
            (error) => error.status === 400
                && error.message === 'Events widget requires config.tagId',
        );
    });
});

describe('buildEventsValue', () => {
    it('returns count for count metric', () => {
        assert.equal(buildEventsValue({ count: 8, sessions: ['a', 'b'] }, 'count'), 8);
    });

    it('returns unique sessions for sessions metric', () => {
        assert.equal(buildEventsValue({ count: 9, sessions: ['a', 'b', 'c'] }, 'sessions'), 3);
    });
});
