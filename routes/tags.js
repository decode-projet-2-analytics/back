const createCrudRouter = require('../lib/create-crud-router');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');

module.exports = createCrudRouter({
    model: Tag,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['comment', 'applicationId', 'tunnelId'],
        patch: ['comment', 'tunnelId'],
    },
    queryFields: ['applicationId', 'tunnelId'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);
            return body;
        },
    },
});
