const crypto = require('crypto');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function normalizeInvitationEmails(emails) {
    if (!Array.isArray(emails)) {
        throw new Error('emails must be an array');
    }

    if (emails.length === 0) {
        throw new Error('emails must contain at least one address');
    }

    const seen = new Set();
    const valid = [];
    const invalid = [];

    for (const value of emails) {
        if (typeof value !== 'string') continue;

        const email = value.trim().toLowerCase();
        if (!email) continue;

        if (!EMAIL_RE.test(email)) {
            invalid.push(email);
            continue;
        }

        if (!seen.has(email)) {
            seen.add(email);
            valid.push(email);
        }
    }

    if (valid.length === 0 && invalid.length === 0) {
        throw new Error('emails must contain at least one address');
    }

    return { valid, invalid };
}

function hashInvitationToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createInvitationTokenPair() {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        tokenHash: hashInvitationToken(token),
    };
}

function buildInvitationExpiresAt(now = new Date()) {
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
}

module.exports = {
    normalizeInvitationEmails,
    hashInvitationToken,
    createInvitationTokenPair,
    buildInvitationExpiresAt,
};
