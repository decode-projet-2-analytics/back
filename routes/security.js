const { Router } = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const User = require('../models/user');
const ApplicationMember = require('../models/application-member');
const ApplicationInvitation = require('../models/application-invitation');
const checkAuth = require('../middlewares/check-auth');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../lib/jwt');
const { validateLoginBody, validateRefreshBody } = require('../lib/validators/login');
const { validateRegisterBody } = require('../lib/validators/register');
const { sendRegistrationPendingEmailSafe } = require('../lib/mail');
const { uploadKbis } = require('../lib/kbis-upload');
const { isKbisDocumentAvailable, parseKbisDocument } = require('../lib/kbis');
const { hashInvitationToken } = require('../lib/team-invitations');

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
    'invitationToken',
];

function pickBody(body, keys) {
    if (!body || typeof body !== 'object') return {};
    return Object.fromEntries(Object.entries(body).filter(([k]) => keys.includes(k)));
}

async function resolvePendingInvitation(invitationToken, email) {
    if (!invitationToken || typeof invitationToken !== 'string') return null;

    const invitation = await ApplicationInvitation.findOne({
        where: {
            tokenHash: hashInvitationToken(invitationToken),
            status: 'pending',
        },
    });

    if (!invitation) {
        const error = new Error('Invitation introuvable');
        error.status = 404;
        throw error;
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
        invitation.status = 'expired';
        await invitation.save({ fields: ['status'] });

        const error = new Error('Invitation expirée');
        error.status = 410;
        throw error;
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase().trim()) {
        const error = new Error('Cette invitation est associée à un autre email');
        error.status = 403;
        throw error;
    }

    return invitation;
}

async function acceptInvitationForUser(invitation, user) {
    if (!invitation) return null;

    const [member] = await ApplicationMember.findOrCreate({
        where: {
            applicationId: invitation.applicationId,
            userId: user.id,
        },
        defaults: {
            role: invitation.role,
            status: 'active',
            invitedBy: invitation.invitedBy,
        },
    });

    if (member.status !== 'active' || member.role !== invitation.role) {
        member.status = 'active';
        member.role = invitation.role;
        member.invitedBy = invitation.invitedBy;
        await member.save({ fields: ['status', 'role', 'invitedBy'] });
    }

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save({ fields: ['status', 'acceptedAt'] });

    return member;
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
        const invitation = await resolvePendingInvitation(req.body?.invitationToken, email);

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

        const user = await User.create({
            email: email.toLowerCase().trim(),
            password,
            firstname,
            lastname,
            role: 'Webmaster',
            status: invitation ? 'validated' : 'pending',
            companyName,
            kbisDocument,
            contactPhone: contactPhone.trim(),
            websiteUrl,
        });

        if (invitation) {
            await acceptInvitationForUser(invitation, user);
        } else {
            sendRegistrationPendingEmailSafe({
                email: email.toLowerCase().trim(),
                companyName,
                contactPhone: contactPhone.trim(),
                websiteUrl,
            });
        }

        return res.status(201).json({
            message: invitation ? 'Compte créé, invitation acceptée' : 'Compte créé, en attente de validation',
            invitationAccepted: Boolean(invitation),
            applicationId: invitation?.applicationId,
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: { message: 'Cet email est déjà utilisé' } });
        }
        if (error.status) {
            return res.status(error.status).json({ error: { message: error.message } });
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
