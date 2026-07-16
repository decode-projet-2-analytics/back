const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const Session = require('../models/session');
const Tag = require('../models/tag');
const { ownershipScope } = require('../lib/utils/ownership-scope');
const Event = require('../models/event');

// Note: every created event is automatically cloned to MongoDB (the
// `sync_events` mirror) by the generic hooks in lib/mongo-sync.js, so
// analytics/stats read from Mongo. No manual clone is needed here.

async function assertEventRelations(req, body) {
    body.applicationId = req.application.id;

    const slug = String(body.tagSlug ?? '').trim();
    if (!slug) {
        const error = new Error('tagSlug is required');
        error.status = 400;
        throw error;
    }

    const tag = await Tag.findOne({
        where: { slug, applicationId: body.applicationId },
    });
    if (!tag) {
        const error = new Error('Tag not found');
        error.status = 404;
        throw error;
    }

    body.tagId = tag.id;
    delete body.tagSlug;

    // Method-induced: browser track always stores type "event"
    body.type = 'event';

    const rawSession = body.sessionId;
    if (rawSession == null || rawSession === '') {
        const error = new Error('sessionId is required');
        error.status = 400;
        throw error;
    }

    if (typeof rawSession === 'string' && !/^\d+$/.test(rawSession)) {
        const { ensureSession } = require('../lib/sdk/ensure-session');
        body.sessionId = await ensureSession(body.applicationId, rawSession);
    } else {
        body.sessionId = Number(rawSession);
        const session = await Session.findOne({
            where: { id: body.sessionId, applicationId: body.applicationId },
        });
        if (!session) {
            const error = new Error('Session not found');
            error.status = 404;
            throw error;
        }
    }

    if (body.metadata == null || typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
        body.metadata = {};
    }
    if (body.payload == null || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
        body.payload = {};
    }
}

const router = createCrudRouter({
    model: Event,
    auth: {
        create: [sdkCors(), sdkAuth()],
        list: checkAuth(),
        get: checkAuth(),
    },
    scope: ownershipScope,
    methods: ['create', 'list', 'get'],
    allowedFields: {
        create: ['type', 'payload', 'metadata', 'sessionId', 'tagSlug'], // type always forced to "event"
    },
    queryFields: ['applicationId', 'sessionId', 'tagId', 'type'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertEventRelations(req, body);
            return body;
        },
        listOptions: () => ({
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
        }),
    },
});

router.options('/', sdkCors());

module.exports = router;
