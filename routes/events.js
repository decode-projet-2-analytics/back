const createCrudRouter = require('../lib/create-crud-router');
const Session = require('../models/session');
const Tag = require('../models/tag');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');
const Event = require('../models/event');

async function assertEventRelations(req, body) {
    await assertApplicationOwnership(req, body.applicationId);

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

module.exports = createCrudRouter({
    model: Event,
    auth: null, //TODO: check auth of sdk clients
    scope: ownershipScope,
    methods: ['create', 'list', 'get'],
    allowedFields: {
        create: ['type', 'payload', 'metadata', 'applicationId', 'sessionId', 'tagId'],
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
