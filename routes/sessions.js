const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const Session = require('../models/session');
const {
    ownershipScope,
    assertResourceApplicationRole,
} = require('../lib/utils/ownership-scope');
const { RESOURCE_WRITE_ROLES } = require('../lib/application-resource-policy');

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
    methods: ['list', 'get', 'create', 'patch', 'delete'],
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
        beforePatch: async (req, body) => {
            await assertResourceApplicationRole(
                req,
                Session,
                req.params.id,
                RESOURCE_WRITE_ROLES.sessions.patch,
                'Session not found',
            );
            return body;
        },
        beforeDelete: async (req) => {
            await assertResourceApplicationRole(
                req,
                Session,
                req.params.id,
                RESOURCE_WRITE_ROLES.sessions.delete,
                'Session not found',
            );
        },
        listOptions: () => ({
            order: [['startedAt', 'DESC'], ['id', 'DESC']],
        }),
    },
});

router.options('/', sdkCors());

module.exports = router;
