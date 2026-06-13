const createCrudRouter = require('../lib/create-crud-router');
const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const checkRole = require('../middlewares/check-role');

module.exports = createCrudRouter({
    model: User,
    auth: {
        list: [checkAuth(), checkRole(['Admin'])],
        put: [checkAuth(), checkRole(['Admin'])],
        create: checkAuth(true),
        patch: [checkAuth()],
        delete: [checkAuth()],
        get: [checkAuth()],
    },
    scope: (req) => (req.user?.role === 'Admin' ? {} : { id: req.user.id }),
    allowedFields: {
        create: (req) => ['lastname', 'firstname', 'birthDate', 'email', 'password', 'companyName', 'kbisDocument', 'contactPhone', 'websiteUrl'].concat(req.user?.role === 'Admin' ? ['role', 'status'] : []),
        put: (req) => ['lastname', 'firstname', 'birthDate', 'email', 'password', 'companyName', 'kbisDocument', 'contactPhone', 'websiteUrl'].concat(req.user?.role === 'Admin' ? ['role', 'status'] : []),
        patch: (req) => ['lastname', 'firstname', 'birthDate', 'email', 'password', 'companyName', 'kbisDocument', 'contactPhone', 'websiteUrl'].concat(req.user?.role === 'Admin' ? ['role', 'status'] : []),
    },
    queryFields: ['email', 'role', 'status', 'companyName'],
});
