export type UserRole = 'admin' | 'webmaster';

export interface AuthUser {
    id: string;
    role: UserRole;
}
