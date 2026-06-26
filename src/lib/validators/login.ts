export interface LoginBody {
    email: string;
    password: string;
}

export interface RefreshBody {
    refreshToken: string;
}

export function validateLoginBody(body: unknown): { data: LoginBody } | { errors: string[] } {
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    const b = body as Record<string, unknown>;

    if (!b.email || typeof b.email !== 'string') errors.push('email est obligatoire');
    else if (!/^\S+@\S+\.\S+$/.test(b.email)) errors.push('email invalide');

    if (!b.password || typeof b.password !== 'string') errors.push('password est obligatoire');

    if (errors.length) return { errors };

    return {
        data: {
            email: b.email as string,
            password: b.password as string,
        },
    };
}

export function validateRefreshBody(body: unknown): { data: RefreshBody } | { errors: string[] } {
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    const b = body as Record<string, unknown>;

    if (!b.refreshToken || typeof b.refreshToken !== 'string') {
        errors.push('refreshToken est obligatoire');
    }

    if (errors.length) return { errors };

    return { data: { refreshToken: b.refreshToken as string } };
}
