const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const Session = require('../models/session');
const Tag = require('../models/tag');
const { ownershipScope } = require('../lib/ownership-scope');
const Event = require('../models/event');

// Note: every created event is automatically cloned to MongoDB (the
// `sync_events` mirror) by the generic hooks in lib/mongo-sync.js, so
// analytics/stats read from Mongo. No manual clone is needed here.

async function assertEventRelations(req, body) {
    body.applicationId = req.application.id;

    const session = await Session.findOne({
        where: { id: body.sessionId, applicationId: body.applicationId },
    });
    if (!session) throw new Error('Session not found');

    const slug = String(body.tagSlug ?? '').trim();
    if (!slug) throw new Error('tagSlug is required');

    const tag = await Tag.findOne({
        where: { slug, applicationId: body.applicationId },
    });
    if (!tag) throw new Error('Tag not found');

    body.tagId = tag.id;
    delete body.tagSlug;
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
        create: ['type', 'payload', 'metadata', 'sessionId', 'tagSlug'],
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
