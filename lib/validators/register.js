function validateRegisterBody(body) {
    const errors = [];
    const { parseKbisDocument } = require('../kbis');

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    if (!body.email || typeof body.email !== 'string') errors.push('email est obligatoire');
    else if (!/^\S+@\S+\.\S+$/.test(body.email)) errors.push('email invalide');

    if (!body.password || typeof body.password !== 'string') errors.push('password est obligatoire');
    else if (body.password.length < 8) errors.push('password doit contenir au moins 8 caractères');

    if (body.companyName !== undefined && body.companyName !== null && typeof body.companyName !== 'string') {
        errors.push('companyName invalide');
    }

    if (!body.kbisDocument || typeof body.kbisDocument !== 'string') errors.push('kbisDocument est obligatoire');
    else if (!parseKbisDocument(body.kbisDocument)) errors.push('kbisDocument invalide');
    if (!body.contactPhone || typeof body.contactPhone !== 'string') errors.push('contactPhone est obligatoire');

    if (body.websiteUrl !== undefined && body.websiteUrl !== null && body.websiteUrl !== '') {
        if (typeof body.websiteUrl !== 'string') errors.push('websiteUrl invalide');
        else if (!/^https?:\/\/.+/.test(body.websiteUrl)) errors.push('websiteUrl invalide');
    }

    if (body.firstname !== undefined && body.firstname !== null && typeof body.firstname !== 'string') {
        errors.push('firstname invalide');
    }

    if (body.lastname !== undefined && body.lastname !== null && typeof body.lastname !== 'string') {
        errors.push('lastname invalide');
    }

    if (errors.length) return { errors };

    return {
        data: {
            email: body.email,
            password: body.password,
            firstname: typeof body.firstname === 'string' ? body.firstname.trim() : null,
            lastname: typeof body.lastname === 'string' ? body.lastname.trim() : null,
            companyName: typeof body.companyName === 'string' ? body.companyName.trim() : null,
            kbisDocument: body.kbisDocument,
            contactPhone: body.contactPhone,
            websiteUrl: typeof body.websiteUrl === 'string' && body.websiteUrl.trim() ? body.websiteUrl.trim() : null,
        },
    };
}

module.exports = { validateRegisterBody };
