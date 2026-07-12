const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveDatabaseUrl } = require('../lib/database-url');

test('resolveDatabaseUrl returns DATABASE_URL when it is defined', () => {
    assert.equal(
        resolveDatabaseUrl({
            DATABASE_URL: 'postgres://postgres:postgres@db/decode',
            NODE_ENV: 'development',
        }),
        'postgres://postgres:postgres@db/decode'
    );
});

test('resolveDatabaseUrl falls back to local postgres outside production', () => {
    assert.equal(
        resolveDatabaseUrl({ NODE_ENV: 'development' }),
        'postgres://postgres:postgres@127.0.0.1:5432/decode'
    );
});

test('resolveDatabaseUrl fails clearly in production without DATABASE_URL', () => {
    assert.throws(
        () => resolveDatabaseUrl({ NODE_ENV: 'production' }),
        /DATABASE_URL is not defined/
    );
});
