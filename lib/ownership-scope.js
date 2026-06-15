const { Op } = require('sequelize');
const Application = require('../models/application');

function ownershipScope(req) {
    if (req.user?.role === 'Admin') return {};
    const table = Application.sequelize.getQueryInterface().quoteIdentifier(
        Application.getTableName()
    );
    const ownerId = Application.sequelize.escape(req.user.id);
    return {
        applicationId: {
            [Op.in]: Application.sequelize.literal(
                `(SELECT id FROM ${table} WHERE "ownerId" = ${ownerId})`
            ),
        },
    };
}

async function assertApplicationOwnership(req, applicationId) {
    if (req.user?.role === 'Admin') return;
    const application = await Application.findOne({
        where: { id: applicationId, ownerId: req.user.id },
    });
    if (!application) throw new Error('Application not found');
}

module.exports = { ownershipScope, assertApplicationOwnership };