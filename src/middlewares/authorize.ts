import { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from '../lib/errors';
import { UserRole } from '../types/auth-user';

export function authorize(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) return next(unauthorized());

        if (!roles.includes(req.user.role)) return next(forbidden());

        return next();
    };
}
