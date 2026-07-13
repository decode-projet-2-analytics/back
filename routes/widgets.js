const createCrudRouter = require('../lib/create-crud-router');
const Widget = require('../models/widget');
const checkAuth = require('../middlewares/check-auth');
const { ownershipScope, assertApplicationOwnership } = require('../lib/utils/ownership-scope');
const { getWidgetData } = require('../lib/widgets/get-data');
const { pushWidget } = require('../lib/socket/analytics/push');
const { normalizeLayout, normalizeWidgetLayout } = require('../lib/widgets/layout');

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

            body.config = body.config || {};
            body.config.layout = normalizeWidgetLayout(body.type, body.config.layout);

            return body;
        },
        beforePatch: async (req, body) => {
            if (body.config !== undefined) {
                body.config = body.config || {};
                if (body.config.layout !== undefined) {
                    body.config.layout = normalizeLayout(body.config.layout);
                }
            }
            return body;
        },
        listOptions: (req) => ({
            order: [['position', 'ASC'], ['id', 'ASC']],
        }),
        afterPatch: async (req, item) => {
            try {
                await pushWidget(item);
            } catch (err) {
                console.error('[analytics] push after patch failed', item.id, err.message);
            }
        },
    },
});
