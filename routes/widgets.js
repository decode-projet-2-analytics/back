const createCrudRouter = require('../lib/create-crud-router');
const Widget = require('../models/widget');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope } = require('../lib/ownership-scope');
const { assertApplicationRole } = require('../lib/application-access');
const { getWidgetData } = require('../lib/widget-data');

async function assertWidgetApplicationRole(req, widgetId, requiredRole) {
    const widget = await Widget.findOne({
        where: { ...ownershipScope(req), id: widgetId },
        attributes: ['applicationId'],
    });

    if (!widget) {
        const error = new Error('Widget not found');
        error.status = 404;
        throw error;
    }

    await assertApplicationRole(req, widget.applicationId, requiredRole);
}

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
            await assertApplicationRole(req, body.applicationId, 'admin');

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
        beforePatch: async (req, body) => {
            await assertWidgetApplicationRole(req, req.params.id, 'admin');
            return body;
        },
        beforeDelete: async (req) => {
            await assertWidgetApplicationRole(req, req.params.id, 'admin');
        },
        listOptions: (req) => ({
            order: [['position', 'ASC'], ['id', 'ASC']],
        }),
    },
});
