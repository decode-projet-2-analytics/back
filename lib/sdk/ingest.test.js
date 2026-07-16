const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const previousModules = new Map();
const createdEvents = [];

function stubModule(request, exports) {
    const path = require.resolve(request);
    previousModules.set(path, require.cache[path]);
    require.cache[path] = {
        id: path,
        filename: path,
        loaded: true,
        exports,
    };
}

stubModule('../../models/tunnel', {
    async findOne() { return { tunnelId: 201 }; },
    async create() { throw new Error('Tunnel.create should not be called'); },
});
stubModule('../../models/tag', {
    async findOne() { return { id: 301 }; },
    async create() { throw new Error('Tag.create should not be called'); },
});
stubModule('../../models/event', {
    async create(values) {
        createdEvents.push(values);
        return { id: createdEvents.length, ...values };
    },
});
stubModule('./ensure-session', {
    async ensureSession(applicationId, sdkSessionId, visitorId) {
        assert.equal(applicationId, 77);
        assert.equal(sdkSessionId, 'browser-session');
        assert.equal(visitorId, 'visitor-42');
        return 501;
    },
});
stubModule('../../models/mongo-snapshot', {
    async findOneAndUpdate() {
        throw new Error('Snapshot storage should not be called');
    },
});

const { ingestSessionPayload } = require('./ingest');

describe('ingestSessionPayload browser interactions', () => {
    after(() => {
        for (const [path, previous] of previousModules) {
            if (previous) require.cache[path] = previous;
            else delete require.cache[path];
        }
    });

    it('persists every browser interaction with the same ownership context', async () => {
        const result = await ingestSessionPayload(77, {
            appId: 'public-app-id',
            sessionId: 'browser-session',
            visitorId: 'visitor-42',
            url: 'https://showcase.example.com/products',
            flushedAt: Date.now(),
            page: {
                title: 'Products',
                referrer: 'https://showcase.example.com/home',
                viewport: { width: 1280, height: 720, dpr: 2 },
                docSize: { width: 1280, height: 2400 },
            },
            mousemove: { points: [{ x: 10, y: 20, timestamp: 1 }] },
            scroll: { samples: [{ scrollX: 0, scrollY: 500, timestamp: 2 }] },
            clicks: {
                items: [{
                    x: 1,
                    y: 2,
                    pageX: 10,
                    pageY: 20,
                    button: 0,
                    timestamp: 3,
                    target: { tagName: 'button', selector: 'button#buy' },
                }],
            },
            tabchange: { items: [{ hidden: true, timestamp: 4 }] },
            submits: {
                items: [{ selector: 'form#checkout', fieldCount: 3, timestamp: 5 }],
            },
        });

        const expectedTypes = [
            'pageview',
            'mousemove',
            'scroll',
            'click',
            'tabchange',
            'form_submit',
        ];

        assert.deepEqual(result.created, expectedTypes);
        assert.deepEqual(createdEvents.map((event) => event.type), expectedTypes);

        for (const event of createdEvents) {
            assert.equal(event.applicationId, 77);
            assert.equal(event.sessionId, 501);
            assert.equal(event.tagId, 301);
            assert.deepEqual(event.metadata, { visitorId: 'visitor-42' });
            assert.equal(event.payload.url, 'https://showcase.example.com/products');
        }
    });
});
