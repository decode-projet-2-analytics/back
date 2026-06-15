const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');
const Session = require('../models/session');

module.exports = createCrudRouter({
    model: Session,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['applicationId', 'startedAt', 'endedAt', 'metadata', 'replay'],
        patch: ['endedAt', 'metadata', 'replay'],
    },
    queryFields: ['applicationId'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);
            return body;
        },
        listOptions: () => ({
            order: [['startedAt', 'DESC'], ['id', 'DESC']],
        }),
    },
});
