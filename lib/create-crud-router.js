const { Router } = require('express');
const checkAuth = require('../middlewares/check-auth');
const checkBody = require('../middlewares/check-body');

const DEFAULT_METHODS = ['list', 'get', 'create', 'put', 'patch', 'delete'];

function resolveMiddleware(middleware) {
    if (middleware === undefined || middleware === false || middleware === null) return [];
    if (middleware === true) return [checkAuth()];
    if (typeof middleware === 'function') return [middleware];
    return Array.isArray(middleware) ? middleware : [middleware];
}

function resolveAuth(auth, method) {
    if (auth === undefined) return [];
    if (typeof auth === 'object' && auth !== null && !Array.isArray(auth) && typeof auth !== 'function') {
        return resolveMiddleware(auth[method]);
    }
    return resolveMiddleware(auth);
}

function resolveAllowedFields(allowedFields, method) {
    const fields = allowedFields[method];
    if (fields === undefined || fields === false) return [];
    return [checkBody(fields)];
}

function buildWhere(scope, req, extra = {}) {
    const base = typeof scope === 'function' ? scope(req) : (scope ?? {});
    return { ...base, ...extra };
}

function buildQueryWhere(req, queryFields) {
    if (!queryFields) return { ...req.query };
    return Object.fromEntries(
        Object.entries(req.query).filter(([key]) => queryFields.includes(key))
    );
}

/**
 * @param {object} options
 * @param {import('sequelize').ModelStatic} options.model - Sequelize model
 * @param {boolean|Function|Function[]|Record<string, boolean|Function|Function[]>} [options.auth] - Auth per route or global
 * @param {Record<string, string[]|Function|false>} [options.allowedFields] - Body whitelist per method (create, put, patch)
 * @param {string[]} [options.queryFields] - Whitelist query params for list route
 * @param {object|Function} [options.scope] - Extra where clause applied to all operations
 * @param {string[]} [options.methods] - Enabled CRUD methods
 * @param {object} [options.updateOptions] - Sequelize update options (returning, individualHooks…)
 * @param {object} [options.hooks] - beforeCreate, beforeUpdate, beforePatch, afterCreate, afterPatch, listOptions, getOptions
 * @param {{ path: string, auth?: *, handler: Function }[]} [options.subCollections]
 */
function createCrudRouter(options) {
    const {
        model,
        auth = {},
        allowedFields = {},
        queryFields,
        scope,
        hooks = {},
        methods = DEFAULT_METHODS,
        updateOptions = { returning: true, individualHooks: true },
        subCollections = [],
    } = options;

    const router = new Router();
    const enabled = new Set(methods);

    if (enabled.has('list')) {
        router.get('/', ...resolveAuth(auth, 'list'), async (req, res, next) => {
            try {
                const where = {
                    ...buildWhere(scope, req),
                    ...buildQueryWhere(req, queryFields),
                };
                const items = await model.findAll({
                    where,
                    ...(hooks.listOptions?.(req) ?? {}),
                });
                res.status(200).json(items);
            } catch (error) {
                next(error);
            }
        });
    }

    if (enabled.has('create')) {
        router.post(
            '/',
            ...resolveAuth(auth, 'create'),
            ...resolveAllowedFields(allowedFields, 'create'),
            async (req, res, next) => {
                try {
                    let body = req.body;
                    if (hooks.beforeCreate) body = await hooks.beforeCreate(req, body);

                    const item = await model.create(body);

                    if (hooks.afterCreate) await hooks.afterCreate(req, item);

                    res.status(201).json(item);
                } catch (error) {
                    next(error);
                }
            }
        );
    }

    for (const sub of subCollections) {
        router.get(
            `/:id/${sub.path}`,
            ...resolveAuth(sub.auth ?? auth, 'get'),
            async (req, res, next) => {
                try {
                    await sub.handler(req, res, next);
                } catch (error) {
                    next(error);
                }
            }
        );
    }

    if (enabled.has('get')) {
        router.get('/:id', ...resolveAuth(auth, 'get'), async (req, res, next) => {
            try {
                const item = await model.findOne({
                    where: buildWhere(scope, req, { id: req.params.id }),
                    ...(hooks.getOptions?.(req) ?? {}),
                });

                if (item) res.json(item);
                else res.sendStatus(404);
            } catch (error) {
                next(error);
            }
        });
    }

    if (enabled.has('delete')) {
        router.delete('/:id', ...resolveAuth(auth, 'delete'), async (req, res, next) => {
            try {
                const nbDeleted = await model.destroy({
                    where: buildWhere(scope, req, { id: req.params.id }),
                });

                if (nbDeleted) res.sendStatus(204);
                else res.sendStatus(404);
            } catch (error) {
                next(error);
            }
        });
    }

    if (enabled.has('put')) {
        router.put(
            '/:id',
            ...resolveAuth(auth, 'put'),
            ...resolveAllowedFields(allowedFields, 'put'),
            async (req, res, next) => {
                try {
                    let body = req.body;
                    if (hooks.beforeUpdate) body = await hooks.beforeUpdate(req, body);

                    const where = buildWhere(scope, req, { id: req.params.id });
                    const nbDeleted = await model.destroy({ where });
                    const item = await model.create({ ...body, id: req.params.id });

                    res.status(nbDeleted ? 200 : 201).json(item);
                } catch (error) {
                    next(error);
                }
            }
        );
    }

    if (enabled.has('patch')) {
        router.patch(
            '/:id',
            ...resolveAuth(auth, 'patch'),
            ...resolveAllowedFields(allowedFields, 'patch'),
            async (req, res, next) => {
                try {
                    let body = req.body;
                    if (hooks.beforePatch) body = await hooks.beforePatch(req, body);
                    else if (hooks.beforeUpdate) body = await hooks.beforeUpdate(req, body);

                    const [nbUpdated, [item]] = await model.update(body, {
                        where: buildWhere(scope, req, { id: req.params.id }),
                        ...updateOptions,
                    });

                    if (nbUpdated) {
                        if (hooks.afterPatch) await hooks.afterPatch(req, item);
                        res.json(item);
                    } else {
                        res.sendStatus(404);
                    }
                } catch (error) {
                    next(error);
                }
            }
        );
    }

    return router;
}

module.exports = createCrudRouter;
