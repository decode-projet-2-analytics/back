const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const { ownershipScope } = require('../lib/ownership-scope');
const Session = require('../models/session');

const router = createCrudRouter({
    model: Session,
    auth: {
        create: [sdkCors(), sdkAuth()],
        list: checkAuth(),
        get: checkAuth(),
        patch: checkAuth(),
        delete: checkAuth(),
    },
    scope: ownershipScope,
    allowedFields: {
        create: ['startedAt', 'endedAt', 'metadata', 'replay'],
        patch: ['endedAt', 'metadata', 'replay'],
    },
    queryFields: ['applicationId'],
    hooks: {
        beforeCreate: async (req, body) => {
            body.applicationId = req.application.id;
            return body;
        },
        listOptions: () => ({
            order: [['startedAt', 'DESC'], ['id', 'DESC']],
        }),
    },
});

router.options('/', sdkCors());

module.exports = router;
