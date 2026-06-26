import jwt from 'jsonwebtoken';
import { UserRole } from '../types/auth-user';
import { JwtPayload } from '../types/jwt-payload';

export const ACCESS_TOKEN_EXPIRES = '15m';
export const REFRESH_TOKEN_EXPIRES = '7d';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return secret;
}

export function signAccessToken(sub: string, role: UserRole): string {
    return jwt.sign({ sub, role }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function signRefreshToken(sub: string, role: UserRole): string {
    return jwt.sign({ sub, role, type: 'refresh' }, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRES });
}

export function verifyAccessToken(token: string): JwtPayload {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (payload.type === 'refresh') {
        throw new Error('Invalid token type');
    }
    return payload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
    }
    return payload;
}
