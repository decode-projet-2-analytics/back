const { accessibleChildScope, assertApplicationRole } = require('../application-access');
function ownershipScope(req) {
    return accessibleChildScope(req.user);
}

async function assertApplicationOwnership(req, applicationId) {
    await assertApplicationRole(req, applicationId, 'member');
}

async function assertResourceApplicationRole(
    req,
    Model,
    resourceId,
    requiredRole,
    notFoundMessage = 'Resource not found',
) {
    const item = await Model.findOne({
        where: { ...ownershipScope(req), id: resourceId },
        attributes: ['applicationId'],
    });

    if (!item) {
        const error = new Error(notFoundMessage);
        error.status = 404;
        throw error;
    }

    await assertApplicationRole(req, item.applicationId, requiredRole);
}

module.exports = {
    ownershipScope,
    assertApplicationOwnership,
    assertResourceApplicationRole,
};
