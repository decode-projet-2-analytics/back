const createCrudRouter = require('../lib/create-crud-router');
const Application = require('../models/application');
const checkAuth = require('../middlewares/check-auth');

module.exports = createCrudRouter({
    model: Application,
    auth: checkAuth(),
    allowedFields: {
        create: ['name', 'allowedUrls', 'appSecret'],
        put: ['name', 'allowedUrls', 'appSecret'],
        patch: ['name', 'allowedUrls', 'appSecret'],
    },
    queryFields: ['ownerId', 'name', 'allowedUrls'],
    scope: (req) => (req.user?.role === 'Admin' ? {} : { ownerId: req.user.id }),
    hooks: {
        beforeCreate: (req, body) => ({
            ...body,
            ownerId: req.user.id,
        }),
    },
});
