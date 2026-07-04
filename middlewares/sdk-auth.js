const bcrypt = require('bcryptjs');
const Application = require('../models/application');

const APP_ID_HEADER = 'x-app-id';
const APP_SECRET_HEADER = 'x-app-secret';

module.exports = function sdkAuth() {
    return async function (req, res, next) {
        try {
            const appId = req.headers[APP_ID_HEADER] || req.body?.appId || req.query.appId;

            if (!appId) {
                return res.status(401).json({ error: { message: 'appId manquant' } });
            }

            const application = await Application.findOne({ where: { appId } });

            if (!application) {
                return res.status(401).json({ error: { message: 'Application inconnue' } });
            }

            const appSecret = req.headers[APP_SECRET_HEADER];

            if (appSecret) {
                // Backend SDK path.
                if (!application.get('appSecret')) {
                    return res.status(401).json({ error: { message: 'Aucun secret actif pour cette application' } });
                }

                const valid = await bcrypt.compare(appSecret, application.get('appSecret'));
                if (!valid) {
                    return res.status(401).json({ error: { message: 'appSecret invalide' } });
                }
            } else {
                const origin = req.headers.origin;
                if (!origin || !application.allowedUrls.includes(origin)) {
                    return res.status(403).json({ error: { message: 'Origine non autorisée pour cette application' } });
                }
            }

            req.application = application;
            return next();
        } catch (error) {
            return next(error);
        }
    };
};
