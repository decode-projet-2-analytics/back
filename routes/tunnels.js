const createCrudRouter = require('../lib/create-crud-router');
const Tunnel = require('../models/tunnel');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope } = require('../lib/ownership-scope');

module.exports = createCrudRouter({
    model: Tunnel,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['comment', 'tagIds', 'applicationId'],
        patch: ['comment', 'tagIds'],
    },
    queryFields: ['applicationId'],
});
