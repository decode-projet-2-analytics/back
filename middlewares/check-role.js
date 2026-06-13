module.exports = function checkRole(roles) {
    const allowed = [].concat(roles);

    return function (req, res, next) {
        if (!req.user) return res.sendStatus(401);

        if (!allowed.includes(req.user.role)) return res.sendStatus(403);

        return next();
    };
};
