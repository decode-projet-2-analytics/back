const { Router } = require('express');
const { Op } = require('sequelize');

const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const checkRole = require('../middlewares/check-role');
const { signAccessToken } = require('../lib/jwt');
const { sendStatusUpdateEmailSafe } = require('../lib/mail');
const { getKbisFilePath } = require('../lib/kbis');

const router = new Router();

const ALLOWED_STATUSES = ['pending', 'validated', 'rejected'];

// GET /api/v1/admin/users?status=pending&role=Webmaster
router.get('/users', checkAuth(), checkRole('Admin'), async (req, res, next) => {
    try {
        const where = {};

        if (req.query.status) {
            if (!ALLOWED_STATUSES.includes(req.query.status)) {
                return res.status(422).json({ error: { message: `status doit être l'un de : ${ALLOWED_STATUSES.join(', ')}` } });
            }
            where.status = req.query.status;
        }

        if (req.query.role) {
            where.role = req.query.role;
        }

        const users = await User.findAll({ where, order: [['createdAt', 'DESC']] });

        return res.json(users);
    } catch (error) {
        return next(error);
    }
});

// GET /api/v1/admin/users/:id/kbis
router.get('/users/:id/kbis', checkAuth(), checkRole('Admin'), async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user?.kbisDocument) {
            return res.sendStatus(404);
        }

        const filePath = getKbisFilePath(user.kbisDocument);

        if (!filePath) {
            return res.sendStatus(404);
        }

        res.type('application/pdf');
        return res.sendFile(filePath);
    } catch (error) {
        return next(error);
    }
});

// PATCH /api/v1/admin/users/:id/status
// body: { status: 'validated' | 'rejected', reason?: string }
router.patch('/users/:id/status', checkAuth(), checkRole('Admin'), async (req, res, next) => {
    try {
        const { status, reason } = req.body;

        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(422).json({ error: { message: `status doit être l'un de : ${ALLOWED_STATUSES.join(', ')}` } });
        }

        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.sendStatus(404);
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ error: { message: 'Impossible de modifier le statut d\'un admin' } });
        }

        await user.update({ status });

        sendStatusUpdateEmailSafe({ email: user.email, status, reason });

        return res.json(user);
    } catch (error) {
        return next(error);
    }
});

// POST /api/v1/admin/impersonate/:id
router.post('/impersonate/:id', checkAuth(), checkRole('Admin'), async (req, res, next) => {
    try {
        const target = await User.findByPk(req.params.id);

        if (!target) return res.sendStatus(404);
        if (target.role === 'Admin') {
            return res.status(403).json({ error: { message: 'Impossible d\'impersonate un admin' } });
        }
        if (target.status !== 'validated') {
            return res.status(403).json({ error: { message: 'Compte non validé' } });
        }

        const token = signAccessToken(String(target.id), target.role, { email: target.email });

        return res.json({ token });
    } catch (error) {
        return next(error);
    }
});
module.exports = router;
