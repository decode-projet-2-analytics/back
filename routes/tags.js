const { Op } = require('sequelize');
const createCrudRouter = require('../lib/create-crud-router');
const Application = require('../models/application');
const Tag = require('../models/tag');
const checkAuth = require('../middlewares/check-auth');

// TODO: vérifier ça
function tagScope(req) {
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

module.exports = createCrudRouter({
    model: Tag,
    auth: checkAuth(),
    scope: tagScope,
    allowedFields: {
        create: ['comment', 'applicationId'],
        patch: ['comment'],
        list: ['applicationId'],
    },
    queryFields: ['applicationId'],
    hooks: {
        beforeCreate: async (req, body) => {
            if (req.user?.role === 'Admin') return body;
            const application = await Application.findOne({
                where: { id: body.applicationId, ownerId: req.user.id },
            });
            if (!application) throw new Error('Application not found');
            return body;
        },
    },
});
