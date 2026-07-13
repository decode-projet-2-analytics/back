const createCrudRouter = require('../lib/create-crud-router');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/utils/ownership-scope');

module.exports = createCrudRouter({
    model: Tag,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['slug', 'comment', 'applicationId'],
        patch: ['comment'],
    },
    queryFields: ['applicationId', 'slug'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);
            body.slug = String(body.slug ?? '').trim();
            body.comment = String(body.comment ?? '').trim();
            return body;
        },
        beforePatch: async (req, body) => {
            if (body.comment !== undefined) {
                body.comment = String(body.comment).trim();
            }
            return body;
        },
    },
});
