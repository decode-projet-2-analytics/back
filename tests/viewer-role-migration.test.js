const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateTeamRole } = require('../lib/application-team-roles');

const migrationPath = path.join(
    __dirname,
    '../migrations/20260715120000-drop-application-team-viewer-role.js',
);

test('application team validation rejects viewer', () => {
    assert.equal(validateTeamRole('admin'), 'admin');
    assert.equal(validateTeamRole('member'), 'member');
    assert.equal(validateTeamRole('viewer'), null);
});

test('viewer migration converts both tables before narrowing enums', () => {
    const source = fs.readFileSync(migrationPath, 'utf8');
    const memberUpdate = source.indexOf(`UPDATE "ApplicationMembers" SET role = 'member' WHERE role = 'viewer'`);
    const invitationUpdate = source.indexOf(`UPDATE "ApplicationInvitations" SET role = 'member' WHERE role = 'viewer'`);
    const memberEnum = source.indexOf(`CREATE TYPE "enum_ApplicationMembers_role" AS ENUM('admin', 'member')`);
    const invitationEnum = source.indexOf(`CREATE TYPE "enum_ApplicationInvitations_role" AS ENUM('admin', 'member')`);

    assert.ok(memberUpdate >= 0 && memberUpdate < memberEnum);
    assert.ok(invitationUpdate >= 0 && invitationUpdate < invitationEnum);
});
