const test = require('node:test');
const assert = require('node:assert/strict');

const { RESOURCE_WRITE_ROLES } = require('../lib/application-resource-policy');

const EXPECTED = {
    tags: { create: 'admin', patch: 'admin', delete: 'admin' },
    tunnels: { create: 'admin', patch: 'admin', delete: 'admin' },
    widgets: { create: 'admin', patch: 'admin', delete: 'admin' },
    sessions: { patch: 'owner', delete: 'owner' },
};

test('application resource write policy matches the permission matrix', () => {
    assert.deepEqual(RESOURCE_WRITE_ROLES, EXPECTED);
});
