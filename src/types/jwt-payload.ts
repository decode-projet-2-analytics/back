import { UserRole } from './auth-user';

export interface JwtPayload {
    sub: string;
    role?: UserRole;
}
