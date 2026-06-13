const crypto = require('crypto');
const createCrudRouter = require('../lib/create-crud-router');
const Site = require('../models/site');
const checkAuth = require('../middlewares/check-auth');

// TODO: vérifier ça
module.exports = createCrudRouter({
    model: Site,
    auth: checkAuth(),
    allowedFields: {
        create: ['name', 'baseUrl', 'corsOrigins', 'appSecret'],
        put: ['name', 'baseUrl', 'corsOrigins', 'appSecret'],
        patch: ['name', 'baseUrl', 'corsOrigins', 'appSecret'],
    },
    queryFields: ['ownerId', 'name'],
    scope: (req) => (req.user?.role === 'Admin' ? {} : { ownerId: req.user.id }),
    hooks: {
        beforeCreate: (req, body) => ({
            ...body,
            ownerId: req.user.id,
            appSecret: body.appSecret ?? crypto.randomBytes(32).toString('hex'),
        }),
    },
});
