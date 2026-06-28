function validateRegisterBody(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    if (!body.email || typeof body.email !== 'string') errors.push('email est obligatoire');
    else if (!/^\S+@\S+\.\S+$/.test(body.email)) errors.push('email invalide');

    if (!body.password || typeof body.password !== 'string') errors.push('password est obligatoire');
    else if (body.password.length < 8) errors.push('password doit contenir au moins 8 caractères');

    if (!body.companyName || typeof body.companyName !== 'string') errors.push('companyName est obligatoire');
    if (!body.kbisDocument || typeof body.kbisDocument !== 'string') errors.push('kbisDocument est obligatoire');
    if (!body.contactPhone || typeof body.contactPhone !== 'string') errors.push('contactPhone est obligatoire');

    if (!body.websiteUrl || typeof body.websiteUrl !== 'string') errors.push('websiteUrl est obligatoire');
    else if (!/^https?:\/\/.+/.test(body.websiteUrl)) errors.push('websiteUrl invalide');

    if (errors.length) return { errors };

    return {
        data: {
            email: body.email,
            password: body.password,
            companyName: body.companyName,
            kbisDocument: body.kbisDocument,
            contactPhone: body.contactPhone,
            websiteUrl: body.websiteUrl,
        },
    };
}

module.exports = { validateRegisterBody };
