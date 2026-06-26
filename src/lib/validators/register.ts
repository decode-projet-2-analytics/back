export interface RegisterBody {
    email: string;
    password: string;
    companyName: string;
    kbisDocument: string;
    contactPhone: string;
    websiteUrl: string;
}

export function validateRegisterBody(body: unknown): { data: RegisterBody } | { errors: string[] } {
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    const b = body as Record<string, unknown>;

    if (!b.email || typeof b.email !== 'string') errors.push('email est obligatoire');
    else if (!/^\S+@\S+\.\S+$/.test(b.email)) errors.push('email invalide');

    if (!b.password || typeof b.password !== 'string') errors.push('password est obligatoire');
    else if (b.password.length < 8) errors.push('password doit contenir au moins 8 caractères');

    if (!b.companyName || typeof b.companyName !== 'string') errors.push('companyName est obligatoire');
    if (!b.kbisDocument || typeof b.kbisDocument !== 'string') errors.push('kbisDocument est obligatoire');
    if (!b.contactPhone || typeof b.contactPhone !== 'string') errors.push('contactPhone est obligatoire');

    if (!b.websiteUrl || typeof b.websiteUrl !== 'string') errors.push('websiteUrl est obligatoire');
    else if (!/^https?:\/\/.+/.test(b.websiteUrl)) errors.push('websiteUrl invalide');

    if (errors.length) return { errors };

    return {
        data: {
            email: b.email as string,
            password: b.password as string,
            companyName: b.companyName as string,
            kbisDocument: b.kbisDocument as string,
            contactPhone: b.contactPhone as string,
            websiteUrl: b.websiteUrl as string,
        },
    };
}
