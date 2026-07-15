const test = require('node:test');
const assert = require('node:assert/strict');

const {
    isTeamRoleAtLeast,
    canManageCredentials,
    canManageTeam,
} = require('../lib/team-permissions');

test('isTeamRoleAtLeast follows owner admin member hierarchy', () => {
    assert.equal(isTeamRoleAtLeast('owner', 'member'), true);
    assert.equal(isTeamRoleAtLeast('admin', 'member'), true);
    assert.equal(isTeamRoleAtLeast('member', 'admin'), false);
    assert.equal(isTeamRoleAtLeast('viewer', 'member'), false);
});

test('canManageCredentials allows owner and admin only', () => {
    assert.equal(canManageCredentials('owner'), true);
    assert.equal(canManageCredentials('admin'), true);
    assert.equal(canManageCredentials('member'), false);
});

test('canManageTeam allows owner and admin only', () => {
    assert.equal(canManageTeam('owner'), true);
    assert.equal(canManageTeam('admin'), true);
    assert.equal(canManageTeam('member'), false);
});
