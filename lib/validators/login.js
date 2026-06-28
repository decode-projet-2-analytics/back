function validateLoginBody(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    if (!body.email || typeof body.email !== 'string') errors.push('email est obligatoire');
    else if (!/^\S+@\S+\.\S+$/.test(body.email)) errors.push('email invalide');

    if (!body.password || typeof body.password !== 'string') errors.push('password est obligatoire');

    if (errors.length) return { errors };

    return { data: { email: body.email, password: body.password } };
}

function validateRefreshBody(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { errors: ['Corps de requête invalide'] };
    }

    if (!body.refreshToken || typeof body.refreshToken !== 'string') {
        errors.push('refreshToken est obligatoire');
    }

    if (errors.length) return { errors };

    return { data: { refreshToken: body.refreshToken } };
}

module.exports = { validateLoginBody, validateRefreshBody };
