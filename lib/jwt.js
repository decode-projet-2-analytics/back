const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return secret;
}

function signAccessToken(sub, role) {
    return jwt.sign({ sub, role }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES });
}

function signRefreshToken(sub, role) {
    return jwt.sign({ sub, role, type: 'refresh' }, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRES });
}

function verifyAccessToken(token) {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type === 'refresh') throw new Error('Invalid token type');
    return payload;
}

function verifyRefreshToken(token) {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    return payload;
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
