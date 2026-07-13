const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

const applicationPath = require.resolve('../models/application');
const bcryptPath = require.resolve('bcryptjs');
const previousApplicationModule = require.cache[applicationPath];
const previousBcryptModule = require.cache[bcryptPath];
let applicationFindCalls = 0;

const application = {
    id: 7,
    allowedUrls: ['https://showcase.example.com'],
    get(field) {
        return field === 'appSecret' ? 'hashed-secret' : undefined;
    },
};

require.cache[applicationPath] = {
    id: applicationPath,
    filename: applicationPath,
    loaded: true,
    exports: {
        async findOne() {
            applicationFindCalls += 1;
            return application;
        },
    },
};
require.cache[bcryptPath] = {
    id: bcryptPath,
    filename: bcryptPath,
    loaded: true,
    exports: { async compare(secret) { return secret === 'valid-secret'; } },
};

const sdkAuth = require('./sdk-auth');

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

describe('sdkAuth secret policy', () => {
    beforeEach(() => {
        applicationFindCalls = 0;
    });

    after(() => {
        if (previousApplicationModule) require.cache[applicationPath] = previousApplicationModule;
        else delete require.cache[applicationPath];
        if (previousBcryptModule) require.cache[bcryptPath] = previousBcryptModule;
        else delete require.cache[bcryptPath];
    });

    it('requires x-app-secret on a server-only route', async () => {
        const req = {
            headers: { origin: 'https://showcase.example.com' },
            body: { appId: 'app-public-id' },
            query: {},
        };
        const res = createResponse();
        let nextCalled = false;

        await sdkAuth({ requireSecret: true })(req, res, () => { nextCalled = true; });

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.error.message, 'appSecret manquant');
        assert.equal(nextCalled, false);
        assert.equal(applicationFindCalls, 0);
    });

    it('accepts valid server credentials', async () => {
        const req = {
            headers: { 'x-app-id': 'app-public-id', 'x-app-secret': 'valid-secret' },
            body: {},
            query: {},
        };
        const res = createResponse();
        let nextCalled = false;

        await sdkAuth({ requireSecret: true })(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.application, application);
        assert.equal(res.statusCode, null);
    });

    it('keeps origin authentication for existing browser routes', async () => {
        const req = {
            headers: { origin: 'https://showcase.example.com' },
            body: { appId: 'app-public-id' },
            query: {},
        };
        const res = createResponse();
        let nextCalled = false;

        await sdkAuth()(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.application, application);
        assert.equal(res.statusCode, null);
    });
});
