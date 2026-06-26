import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../../models';
import {
    conflict,
    forbidden,
    isMongoDuplicateKeyError,
    notImplemented,
    unauthorized,
    unprocessable,
} from '../../lib/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { validateLoginBody, validateRefreshBody } from '../../lib/validators/login';
import { validateRegisterBody } from '../../lib/validators/register';

const router = Router();

const REGISTER_ALLOWED_KEYS = [
    'email',
    'password',
    'companyName',
    'kbisDocument',
    'contactPhone',
    'websiteUrl',
] as const;

function pickBody(body: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};
    return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
}

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = validateRegisterBody(pickBody(req.body, REGISTER_ALLOWED_KEYS));

        if ('errors' in result) {
            return next(unprocessable('Champs invalides', result.errors));
        }

        const { email, password, companyName, kbisDocument, contactPhone, websiteUrl } = result.data;

        await User.create({
            email: email.toLowerCase().trim(),
            password,
            role: 'webmaster',
            status: 'pending',
            companyName: companyName.trim(),
            kbisDocument,
            contactPhone: contactPhone.trim(),
            websiteUrl,
        });

        return res.status(201).json({
            message: 'Compte créé, en attente de validation',
        });
    } catch (err) {
        if (isMongoDuplicateKeyError(err)) {
            return next(conflict('Cet email est déjà utilisé'));
        }
        return next(err);
    }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = validateLoginBody(pickBody(req.body, ['email', 'password']));

        if ('errors' in result) {
            return next(unprocessable('Champs invalides', result.errors));
        }

        const { email, password } = result.data;
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return next(unauthorized('Email ou mot de passe incorrect'));
        }

        if (user.role === 'webmaster' && user.status === 'pending') {
            return next(forbidden('Compte en attente de validation par un administrateur'));
        }

        if (user.role === 'webmaster' && user.status === 'rejected') {
            return next(forbidden('Compte refusé par un administrateur'));
        }

        const accessToken = signAccessToken(user._id.toString(), user.role);
        const refreshToken = signRefreshToken(user._id.toString(), user.role);

        return res.json({ accessToken, refreshToken });
    } catch (err) {
        return next(err);
    }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = validateRefreshBody(pickBody(req.body, ['refreshToken']));

        if ('errors' in result) {
            return next(unprocessable('Champs invalides', result.errors));
        }

        let payload;
        try {
            payload = verifyRefreshToken(result.data.refreshToken);
        } catch {
            return next(unauthorized('Refresh token invalide ou expiré'));
        }

        const user = await User.findById(payload.sub);

        if (!user) {
            return next(unauthorized('Refresh token invalide ou expiré'));
        }

        if (user.role === 'webmaster' && user.status !== 'validated') {
            return next(forbidden('Compte non autorisé'));
        }

        const accessToken = signAccessToken(user._id.toString(), user.role);

        return res.json({ accessToken });
    } catch (err) {
        return next(err);
    }
});

router.post('/logout', (_req, _res, next) => next(notImplemented()));

export default router;
