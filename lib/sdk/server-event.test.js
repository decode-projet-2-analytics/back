const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { ingestServerEvent } = require('./server-event');

function createDependencies(overrides = {}) {
    const calls = {
        tagWhere: null,
        ensuredSession: null,
        createdEvent: null,
        emitted: null,
    };

    const dependencies = {
        Tag: {
            async findOne({ where }) {
                calls.tagWhere = where;
                return { id: 31 };
            },
        },
        Event: {
            async create(values) {
                calls.createdEvent = values;
                return { id: 91, ...values };
            },
        },
        async ensureSession(applicationId, sdkSessionId) {
            calls.ensuredSession = { applicationId, sdkSessionId };
            return 51;
        },
        emit(eventName, applicationId) {
            calls.emitted = { eventName, applicationId };
        },
        analyticsIngestedEvent: 'analytics:ingested',
        ...overrides,
    };

    return { calls, dependencies };
}

describe('ingestServerEvent', () => {
    it('stores the business type and scopes tag and session to the authenticated application', async () => {
        const { calls, dependencies } = createDependencies();

        const event = await ingestServerEvent(7, {
            type: ' purchase ',
            tagSlug: ' purchase_confirmed ',
            sessionId: ' visitor-session-12 ',
            payload: { amount: 49.99 },
            metadata: { source: 'showcase' },
        }, dependencies);

        assert.deepEqual(calls.tagWhere, {
            slug: 'purchase_confirmed',
            applicationId: 7,
        });
        assert.deepEqual(calls.ensuredSession, {
            applicationId: 7,
            sdkSessionId: 'visitor-session-12',
        });
        assert.deepEqual(calls.createdEvent, {
            type: 'purchase',
            payload: { amount: 49.99 },
            metadata: { source: 'showcase' },
            applicationId: 7,
            sessionId: 51,
            tagId: 31,
        });
        assert.equal(event.id, 91);
        assert.deepEqual(calls.emitted, {
            eventName: 'analytics:ingested',
            applicationId: 7,
        });
    });

    for (const [field, body] of [
        ['type', { tagSlug: 'tag', sessionId: 'session' }],
        ['tagSlug', { type: 'purchase', sessionId: 'session' }],
        ['sessionId', { type: 'purchase', tagSlug: 'tag' }],
    ]) {
        it(`rejects a missing ${field}`, async () => {
            const { dependencies } = createDependencies();

            await assert.rejects(
                ingestServerEvent(7, body, dependencies),
                (error) => error.status === 400
                    && error.message === `${field} is required`,
            );
        });
    }

    it('rejects an unknown or cross-application tag', async () => {
        const { dependencies } = createDependencies({
            Tag: { async findOne() { return null; } },
        });

        await assert.rejects(
            ingestServerEvent(7, {
                type: 'purchase',
                tagSlug: 'other-application-tag',
                sessionId: 'session',
            }, dependencies),
            (error) => error.status === 404 && error.message === 'Tag not found',
        );
    });

    it('uses empty objects when payload and metadata are invalid', async () => {
        const { calls, dependencies } = createDependencies();

        await ingestServerEvent(7, {
            type: 'signup',
            tagSlug: 'account_created',
            sessionId: 123,
            payload: null,
            metadata: [],
        }, dependencies);

        assert.deepEqual(calls.ensuredSession, {
            applicationId: 7,
            sdkSessionId: 123,
        });
        assert.deepEqual(calls.createdEvent.payload, {});
        assert.deepEqual(calls.createdEvent.metadata, {});
    });
});
