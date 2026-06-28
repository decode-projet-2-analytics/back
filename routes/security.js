const { Router } = require('express');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../lib/jwt');
const { validateLoginBody, validateRefreshBody } = require('../lib/validators/login');
const { validateRegisterBody } = require('../lib/validators/register');
const { sendRegistrationPendingEmailSafe } = require('../lib/mail');

const router = new Router();

const REGISTER_KEYS = ['email', 'password', 'companyName', 'kbisDocument', 'contactPhone', 'websiteUrl'];

function pickBody(body, keys) {
    if (!body || typeof body !== 'object') return {};
    return Object.fromEntries(Object.entries(body).filter(([k]) => keys.includes(k)));
}

router.post('/register', async (req, res, next) => {
    try {
        const result = validateRegisterBody(pickBody(req.body, REGISTER_KEYS));

        if (result.errors) {
            return res.status(422).json({ error: { message: 'Champs invalides', details: result.errors } });
        }

        const { email, password, companyName, kbisDocument, contactPhone, websiteUrl } = result.data;

        await User.create({
            email: email.toLowerCase().trim(),
            password,
            role: 'Webmaster',
            status: 'pending',
            companyName: companyName.trim(),
            kbisDocument,
            contactPhone: contactPhone.trim(),
            websiteUrl,
        });

        sendRegistrationPendingEmailSafe({
            email: email.toLowerCase().trim(),
            companyName: companyName.trim(),
            contactPhone: contactPhone.trim(),
            websiteUrl,
        });

        return res.status(201).json({ message: 'Compte créé, en attente de validation' });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: { message: 'Cet email est déjà utilisé' } });
        }
        return next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const result = validateLoginBody(pickBody(req.body, ['email', 'password']));

        if (result.errors) {
            return res.status(422).json({ error: { message: 'Champs invalides', details: result.errors } });
        }

        const { email, password } = result.data;

        const user = await User.findOne({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: { message: 'Email ou mot de passe incorrect' } });
        }

        if (user.role === 'Webmaster' && user.status === 'pending') {
            return res.status(403).json({ error: { message: 'Compte en attente de validation' } });
        }

        if (user.role === 'Webmaster' && user.status === 'rejected') {
            return res.status(403).json({ error: { message: 'Compte refusé' } });
        }

        const sub = String(user.id);
        const accessToken = signAccessToken(sub, user.role);
        const refreshToken = signRefreshToken(sub, user.role);

        return res.json({
            accessToken,
            refreshToken,
            token: accessToken,
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/refresh', async (req, res, next) => {
    try {
        const result = validateRefreshBody(pickBody(req.body, ['refreshToken']));

        if (result.errors) {
            return res.status(422).json({ error: { message: 'Champs invalides', details: result.errors } });
        }

        let payload;
        try {
            payload = verifyRefreshToken(result.data.refreshToken);
        } catch {
            return res.status(401).json({ error: { message: 'Refresh token invalide ou expiré' } });
        }

        const user = await User.findByPk(payload.sub);

        if (!user) {
            return res.status(401).json({ error: { message: 'Refresh token invalide ou expiré' } });
        }

        if (user.role === 'Webmaster' && user.status !== 'validated') {
            return res.status(403).json({ error: { message: 'Compte non autorisé' } });
        }

        const accessToken = signAccessToken(String(user.id), user.role);

        return res.json({ accessToken, token: accessToken });
    } catch (error) {
        return next(error);
    }
});

router.post('/logout', checkAuth(), (_req, res) => {
    res.sendStatus(204);
});

module.exports = router;
