const { Op } = require('sequelize');
const Application = require('../models/application');
const ApplicationMember = require('../models/application-member');
const { isTeamRoleAtLeast } = require('./team-permissions');

function forbidden(message = 'Forbidden') {
    const error = new Error(message);
    error.status = 403;
    return error;
}

function notFound(message = 'Application not found') {
    const error = new Error(message);
    error.status = 404;
    return error;
}

async function getApplicationRole(user, applicationId) {
    if (!user) return null;
    if (user.role === 'Admin') return 'owner';

    const application = await Application.findByPk(applicationId, {
        attributes: ['id', 'ownerId'],
    });

    if (!application) return null;
    if (application.ownerId === user.id) return 'owner';

    const membership = await ApplicationMember.findOne({
        where: {
            applicationId,
            userId: user.id,
            status: 'active',
        },
        attributes: ['role'],
    });

    return membership?.role ?? null;
}

async function assertApplicationRole(req, applicationId, requiredRole = 'viewer') {
    const role = await getApplicationRole(req.user, applicationId);
    if (!role) throw notFound();
    if (!isTeamRoleAtLeast(role, requiredRole)) throw forbidden();
    return role;
}

function accessibleApplicationIdWhere(user) {
    if (user?.role === 'Admin') return {};
    if (!user?.id) return { id: { [Op.eq]: null } };

    const sequelize = Application.sequelize;
    const applicationTable = sequelize.getQueryInterface().quoteIdentifier(Application.getTableName());
    const memberTable = sequelize.getQueryInterface().quoteIdentifier(ApplicationMember.getTableName());
    const userId = sequelize.escape(user.id);

    return {
        id: {
            [Op.in]: sequelize.literal(
                `(
                    SELECT id FROM ${applicationTable} WHERE "ownerId" = ${userId}
                    UNION
                    SELECT "applicationId" FROM ${memberTable}
                    WHERE "userId" = ${userId} AND status = 'active'
                )`
            ),
        },
    };
}

function accessibleChildScope(user) {
    if (user?.role === 'Admin') return {};
    if (!user?.id) return { applicationId: { [Op.eq]: null } };

    const sequelize = Application.sequelize;
    const applicationTable = sequelize.getQueryInterface().quoteIdentifier(Application.getTableName());
    const memberTable = sequelize.getQueryInterface().quoteIdentifier(ApplicationMember.getTableName());
    const userId = sequelize.escape(user.id);

    return {
        applicationId: {
            [Op.in]: sequelize.literal(
                `(
                    SELECT id FROM ${applicationTable} WHERE "ownerId" = ${userId}
                    UNION
                    SELECT "applicationId" FROM ${memberTable}
                    WHERE "userId" = ${userId} AND status = 'active'
                )`
            ),
        },
    };
}

module.exports = {
    getApplicationRole,
    assertApplicationRole,
    accessibleApplicationIdWhere,
    accessibleChildScope,
};
