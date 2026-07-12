const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeInvitationEmails,
    createInvitationTokenPair,
} = require('../lib/team-invitations');

test('normalizeInvitationEmails trims, lowercases and deduplicates valid emails', () => {
    const result = normalizeInvitationEmails([
        ' Alice@Example.com ',
        'bob@example.com',
        'alice@example.com',
        'bad-email',
        '',
        42,
    ]);

    assert.deepEqual(result.valid, ['alice@example.com', 'bob@example.com']);
    assert.deepEqual(result.invalid, ['bad-email']);
});

test('normalizeInvitationEmails rejects payloads without a non-empty email list', () => {
    assert.throws(
        () => normalizeInvitationEmails([]),
        /emails must contain at least one address/
    );
    assert.throws(
        () => normalizeInvitationEmails('alice@example.com'),
        /emails must be an array/
    );
});

test('createInvitationTokenPair returns a raw token and a different sha256 hash', () => {
    const pair = createInvitationTokenPair();

    assert.equal(typeof pair.token, 'string');
    assert.equal(pair.token.length, 64);
    assert.equal(typeof pair.tokenHash, 'string');
    assert.equal(pair.tokenHash.length, 64);
    assert.notEqual(pair.token, pair.tokenHash);
});
