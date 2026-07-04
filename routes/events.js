const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const Session = require('../models/session');
const Tag = require('../models/tag');
const { ownershipScope } = require('../lib/ownership-scope');
const Event = require('../models/event');

async function assertEventRelations(req, body) {
    body.applicationId = req.application.id;

    const [session, tag] = await Promise.all([
        Session.findOne({
            where: { id: body.sessionId, applicationId: body.applicationId },
        }),
        Tag.findOne({
            where: { id: body.tagId, applicationId: body.applicationId },
        }),
    ]);

    if (!session) throw new Error('Session not found');
    if (!tag) throw new Error('Tag not found');
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
        create: ['type', 'payload', 'metadata', 'sessionId', 'tagId'],
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
