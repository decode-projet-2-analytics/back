const createCrudRouter = require('../lib/create-crud-router');
const Widget = require('../models/widget');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');

module.exports = createCrudRouter({
    model: Widget,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['type', 'title', 'config', 'applicationId', 'position'],
        patch: ['type', 'title', 'config', 'position'],
    },
    queryFields: ['applicationId', 'type'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);
            return body;
        },
        listOptions: (req) => ({
            order: [['position', 'ASC'], ['id', 'ASC']],
        }),
    },
});
