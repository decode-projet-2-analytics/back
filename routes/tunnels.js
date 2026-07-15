const createCrudRouter = require('../lib/create-crud-router');
const Tunnel = require('../models/tunnel');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');
const { assertApplicationRole } = require('../lib/application-access');
const {
    ownershipScope,
    assertResourceApplicationRole,
} = require('../lib/utils/ownership-scope');
const { RESOURCE_WRITE_ROLES } = require('../lib/application-resource-policy');

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
    methods: ['list', 'get', 'create', 'patch', 'delete'],
    allowedFields: {
        create: ['name', 'tagIds', 'applicationId'],
        patch: ['name', 'tagIds'],
    },
    queryFields: ['applicationId'],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationRole(req, body.applicationId, RESOURCE_WRITE_ROLES.tunnels.create);
            body.name = String(body.name ?? '').trim();
            await assertTagIdsBelongToApplication(body.tagIds, body.applicationId);
            return body;
        },
        beforePatch: async (req, body) => {
            await assertResourceApplicationRole(
                req,
                Tunnel,
                req.params.id,
                RESOURCE_WRITE_ROLES.tunnels.patch,
                'Tunnel not found',
            );
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
        beforeDelete: async (req) => {
            await assertResourceApplicationRole(
                req,
                Tunnel,
                req.params.id,
                RESOURCE_WRITE_ROLES.tunnels.delete,
                'Tunnel not found',
            );
        },
    },
});
