const createCrudRouter = require('../lib/create-crud-router');
const Widget = require('../models/widget');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');
const { getWidgetData } = require('../lib/widget-data');

module.exports = createCrudRouter({
    model: Widget,
    auth: checkAuth(),
    scope: ownershipScope,
    allowedFields: {
        create: ['type', 'title', 'config', 'applicationId', 'position'],
        patch: ['type', 'title', 'config', 'position'],
    },
    queryFields: ['applicationId', 'type'],
    subCollections: [
        {
            path: 'data',
            auth: checkAuth(),
            handler: getWidgetData,
        },
    ],
    hooks: {
        beforeCreate: async (req, body) => {
            await assertApplicationOwnership(req, body.applicationId);

            if (body.position === undefined || body.position === null) {
                const latest = await Widget.findOne({
                    where: { applicationId: body.applicationId },
                    order: [['position', 'DESC']],
                    attributes: ['position'],
                });
                body.position = (latest?.position ?? -1) + 1;
            }

            return body;
        },
        listOptions: (req) => ({
            order: [['position', 'ASC'], ['id', 'ASC']],
        }),
    },
});
