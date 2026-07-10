const createCrudRouter = require('../lib/create-crud-router');
const Tunnel = require('../models/tunnel');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');

async function assertTagIdsBelongToApplication(tagIds, applicationId) {
    const ids = Array.isArray(tagIds) ? tagIds : [];
    if (ids.length === 0) return;

    const uniqueIds = [...new Set(ids.map(Number))];
    const tags = await Tag.findAll({
        where: {
            id: uniqueIds,
            applicationId,
        },
        attributes: ['id'],
    });

    if (tags.length !== uniqueIds.length) {
        const error = new Error('One or more tagIds do not belong to this application');
        error.status = 400;
        throw error;
    }
}

module.exports = createCrudRouter({
    model: Tunnel,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['name', 'tagIds', 'applicationId'],
        patch: ['name', 'tagIds'],
    },
    queryFields: ['applicationId'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);
            body.name = String(body.name ?? '').trim();
            await assertTagIdsBelongToApplication(body.tagIds, body.applicationId);
            return body;
        },
        beforePatch: async (req, body) => {
            if (body.name !== undefined) {
                body.name = String(body.name).trim();
            }
            if (body.tagIds !== undefined) {
                const tunnel = await Tunnel.findOne({
                    where: { ...ownershipScope(req), id: req.params.id },
                });
                if (!tunnel) {
                    const error = new Error('Tunnel not found');
                    error.status = 404;
                    throw error;
                }
                await assertTagIdsBelongToApplication(body.tagIds, tunnel.applicationId);
            }
            return body;
        },
    },
});
