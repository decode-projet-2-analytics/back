module.exports = function middlewareCheckBody(allowedKeysGeneratorOrTable) {
    return (req, res, next) => {
        if (!req.body) next();
        else {
            req.body = Object.fromEntries(
                Object
                    .entries(req.body)
                    .filter(([key]) => {
                        const allowedKeys = typeof allowedKeysGeneratorOrTable === "function" ? allowedKeysGeneratorOrTable(req) : allowedKeysGeneratorOrTable;
                        return !allowedKeys.length || allowedKeys.includes(key)
                    })
            )
            next();
        }
    }
}