const createCrudRouter = require('../lib/create-crud-router');
const Tunnel = require('../models/tunnel');
const checkAuth = require('../middlewares/check-auth');

// TODO: vérifier ça
module.exports = createCrudRouter({
    model: Tunnel,
    auth: checkAuth(),
    methods: ['list', 'get', 'create', 'patch', 'delete'],
    allowedFields: {
        create: ['comment', 'tagIds', 'siteId'],
        patch: ['comment'],
    },
    queryFields: ['siteId'],
});
