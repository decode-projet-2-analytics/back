const createCrudRouter = require('../lib/create-crud-router');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');
const { assertApplicationRole } = require('../lib/application-access');
const {
    ownershipScope,
    assertResourceApplicationRole,
} = require('../lib/utils/ownership-scope');
const { RESOURCE_WRITE_ROLES } = require('../lib/application-resource-policy');

module.exports = createCrudRouter({
    model: Tag,
    auth: checkAuth(),
    scope: ownershipScope,
    methods: ['list', 'get', 'create', 'patch', 'delete'],
    allowedFields: {
        create: ['slug', 'comment', 'applicationId'],
        patch: ['comment'],
    },
    queryFields: ['applicationId', 'slug'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationRole(req, body.applicationId, RESOURCE_WRITE_ROLES.tags.create);
            body.slug = String(body.slug ?? '').trim();
            body.comment = String(body.comment ?? '').trim();
            return body;
        },
        beforePatch: async (req, body) => {
            await assertResourceApplicationRole(
                req,
                Tag,
                req.params.id,
                RESOURCE_WRITE_ROLES.tags.patch,
                'Tag not found',
            );
            if (body.comment !== undefined) {
                body.comment = String(body.comment).trim();
            }
            return body;
        },
        beforeDelete: async (req) => {
            await assertResourceApplicationRole(
                req,
                Tag,
                req.params.id,
                RESOURCE_WRITE_ROLES.tags.delete,
                'Tag not found',
            );
        },
    },
});
