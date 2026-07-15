const test = require('node:test');
const assert = require('node:assert/strict');

const {
    canGlobalRoleListAllApplications,
    canGlobalRoleAccessApplicationDetails,
} = require('../lib/application-policy');

test('global admin can list all applications', () => {
    assert.equal(canGlobalRoleListAllApplications('Admin'), true);
});

test('global admin cannot access application details directly', () => {
    assert.equal(canGlobalRoleAccessApplicationDetails('Admin'), false);
});

test('webmaster application details are resolved from ownership or membership', () => {
    assert.equal(canGlobalRoleAccessApplicationDetails('Webmaster'), true);
});
