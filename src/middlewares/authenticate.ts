import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../lib/errors';
import { JwtPayload } from '../types/jwt-payload';
import { AuthUser } from '../types/auth-user';

export function authenticate(optional = false) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const rawHeader = req.headers.authorization ?? req.headers.Authorization;
        const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

        if (!header) {
            if (optional) return next();
            return next(unauthorized());
        }

        const [type, token] = header.split(/\s+/);

        if (type !== 'Bearer' || !token) {
            if (optional) return next();
            return next(unauthorized());
        }

        try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // TODO: remplacer par User.findById() quand Mongoose sera branché
        req.user = {
            id: payload.sub,
            role: payload.role ?? 'webmaster',
        } satisfies AuthUser;

        return next();
        } catch {
            if (optional) return next();
            return next(unauthorized());
        }
    };
}
