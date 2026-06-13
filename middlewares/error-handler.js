module.exports = function middlewareError(error, req, res, next) {
    if (error.name === "SequelizeValidationError") {
        const errors = error.errors.reduce((acc, item) => {
            if (!acc[item.path]) {
                acc[item.path] = [];
            }
            acc[item.path].push(item.message);
            return acc;
        }, {});
        /**
         * Format:
         * {
         *   "password": ["required", "must contains 1 min, 1 number, 1 maj, 1 special"]
         * }
         */
        res.status(422).json(errors);
    } else {
        console.error(error);
        res.sendStatus(500);
    }
}