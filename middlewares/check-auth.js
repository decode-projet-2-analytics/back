const User = require('../models/user');
const { verifyAccessToken } = require('../lib/jwt');

module.exports = function checkAuth(transient = false) {
    return async function (req, res, next) {
        const header = req.headers.authorization ?? req.headers.Authorization;

        if (header === undefined) {
            if (transient) return next();
            return res.sendStatus(401);
        }

        const [type, token] = header.split(/\s+/);

        if (type !== 'Bearer') {
            if (transient) return next();
            return res.sendStatus(401);
        }

        try {
            const payload = verifyAccessToken(token);
            req.user = await User.findByPk(payload.sub);

            if (!req.user) {
                if (transient) return next();
                return res.sendStatus(401);
            }

            return next();
        } catch (error) {
            console.error(error);
            if (transient) return next();
            return res.sendStatus(401);
        }
    };
};
