const crypto = require('crypto');
const createCrudRouter = require('../lib/create-crud-router');
const Application = require('../models/application');
const checkAuth = require('../middlewares/check-auth');

const scope = (req) => (req.user?.role === 'Admin' ? {} : { ownerId: req.user.id });

const router = createCrudRouter({
    model: Application,
    auth: checkAuth(),
    allowedFields: {
        create: ['name', 'allowedUrls'],
        put: ['name', 'allowedUrls'],
        patch: ['name', 'allowedUrls'],
    },
    queryFields: ['ownerId', 'name', 'allowedUrls'],
    scope,
    hooks: {
        beforeCreate: (req, body) => ({
            ...body,
            ownerId: req.user.id,
        }),
    },
});

router.post('/:id/secret', checkAuth(), async (req, res, next) => {
    try {
        const application = await Application.findOne({
            where: { ...scope(req), id: req.params.id },
        });

        if (!application) return res.sendStatus(404);

        const plainSecret = crypto.randomBytes(32).toString('hex');
        application.appSecret = plainSecret;
        await application.save({ fields: ['appSecret'] });

        return res.status(201).json({
            id: application.id,
            appId: application.appId,
            appSecret: plainSecret,
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id/secret', checkAuth(), async (req, res, next) => {
    try {
        const [nbUpdated] = await Application.update(
            { appSecret: null },
            {
                where: { ...scope(req), id: req.params.id },
                individualHooks: true,
                fields: ['appSecret'],
            }
        );

        if (!nbUpdated) return res.sendStatus(404);

        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
