const { Router } = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../lib/jwt');
const { validateLoginBody, validateRefreshBody } = require('../lib/validators/login');
const { validateRegisterBody } = require('../lib/validators/register');
const { sendRegistrationPendingEmailSafe } = require('../lib/mail');
const { uploadKbis } = require('../lib/kbis-upload');
const { isKbisDocumentAvailable, parseKbisDocument } = require('../lib/kbis');

const router = new Router();

const REGISTER_KEYS = [
    'email',
    'password',
    'firstname',
    'lastname',
    'companyName',
    'kbisDocument',
    'contactPhone',
    'websiteUrl',
];

function pickBody(body, keys) {
    if (!body || typeof body !== 'object') return {};
    return Object.fromEntries(Object.entries(body).filter(([k]) => keys.includes(k)));
}

router.post('/kbis', (req, res) => {
    uploadKbis(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(422).json({ error: { message: 'Fichier trop volumineux (5 Mo max)' } });
            }

            return res.status(422).json({
                error: { message: err.message || 'Upload invalide' },
            });
        }

        if (!req.file) {
            return res.status(422).json({ error: { message: 'Fichier KBIS obligatoire' } });
        }

        return res.status(201).json({
            kbisDocument: `/uploads/kbis/${req.file.filename}`,
        });
    });
});

router.post('/register', async (req, res, next) => {
    try {
        const result = validateRegisterBody(pickBody(req.body, REGISTER_KEYS));

        if (result.errors) {
            return res.status(422).json({ error: { message: 'Champs invalides', details: result.errors } });
        }

        const {
            email,
            password,
            firstname,
            lastname,
            companyName,
            kbisDocument,
            contactPhone,
            websiteUrl,
        } = result.data;

        if (!parseKbisDocument(kbisDocument)) {
            return res.status(422).json({
                error: { message: 'Document KBIS invalide', details: ['kbisDocument invalide'] },
            });
        }

        if (!(await isKbisDocumentAvailable(kbisDocument, User))) {
            return res.status(422).json({
                error: { message: 'Document KBIS introuvable ou déjà utilisé', details: ['kbisDocument'] },
            });
        }

        await User.create({
            email: email.toLowerCase().trim(),
            password,
            firstname,
            lastname,
            role: 'Webmaster',
            status: 'pending',
            companyName,
            kbisDocument,
            contactPhone: contactPhone.trim(),
            websiteUrl,
        });

        sendRegistrationPendingEmailSafe({
            email: email.toLowerCase().trim(),
            companyName,
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
