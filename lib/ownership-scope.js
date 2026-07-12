const { accessibleChildScope } = require('./application-access');

function ownershipScope(req) {
    return accessibleChildScope(req.user);
}

async function assertApplicationOwnership(req, applicationId) {
    const { assertApplicationRole } = require('./application-access');
    await assertApplicationRole(req, applicationId, 'member');
}

module.exports = { ownershipScope, assertApplicationOwnership };
