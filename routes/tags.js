const createCrudRouter = require('../lib/create-crud-router');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');

// TODO: vérifier ça
module.exports = createCrudRouter({
    model: Tag,
    auth: checkAuth(),
    methods: ['list', 'get', 'create', 'patch', 'delete'],
    allowedFields: {
        create: ['comment', 'siteId'],
        patch: ['comment'],
    },
    queryFields: ['siteId'],
});
