const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveMailProvider, parseMailAddress, normalizeRecipients } = require('../lib/mail');

test('resolveMailProvider uses Mailtrap API token when SMTP is not configured', () => {
    assert.deepEqual(
        resolveMailProvider({
            MAILTRIP_API_TOKEN: 'token',
            MAIL_FROM: 'Decode Analytics <noreply@example.com>',
        }),
        {
            type: 'mailtrap-api',
            token: 'token',
            endpoint: 'https://send.api.mailtrap.io/api/send',
        }
    );
});

test('resolveMailProvider prefers SMTP when both SMTP and API token are configured', () => {
    assert.deepEqual(
        resolveMailProvider({
            MAILTRAP_API_TOKEN: 'token',
            SMTP_HOST: 'live.smtp.mailtrap.io',
            SMTP_USER: 'api',
            SMTP_PASS: 'pass',
            MAIL_FROM: 'Decode Analytics <noreply@example.com>',
        }),
        { type: 'smtp' }
    );
});

test('resolveMailProvider supports SMTP fallback', () => {
    assert.deepEqual(
        resolveMailProvider({
            SMTP_HOST: 'sandbox.smtp.mailtrap.io',
            SMTP_USER: 'user',
            SMTP_PASS: 'pass',
            MAIL_FROM: 'Decode Analytics <noreply@example.com>',
        }),
        { type: 'smtp' }
    );
});

test('parseMailAddress splits display name and email', () => {
    assert.deepEqual(parseMailAddress('Decode Analytics <noreply@example.com>'), {
        name: 'Decode Analytics',
        email: 'noreply@example.com',
    });
    assert.deepEqual(parseMailAddress('noreply@example.com'), {
        email: 'noreply@example.com',
    });
});

test('normalizeRecipients supports display names', () => {
    assert.deepEqual(normalizeRecipients('A Test User <test@example.com>'), [
        {
            name: 'A Test User',
            email: 'test@example.com',
        },
    ]);
});
