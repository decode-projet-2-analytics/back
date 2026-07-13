const TEAM_ROLE_RANKS = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
};

function isTeamRoleAtLeast(actualRole, requiredRole) {
    return (TEAM_ROLE_RANKS[actualRole] ?? 0) >= (TEAM_ROLE_RANKS[requiredRole] ?? 0);
}

function canManageCredentials(role) {
    return isTeamRoleAtLeast(role, 'admin');
}

function canManageTeam(role) {
    return isTeamRoleAtLeast(role, 'admin');
}

function canWriteApplicationData(role) {
    return isTeamRoleAtLeast(role, 'member');
}

module.exports = {
    TEAM_ROLE_RANKS,
    isTeamRoleAtLeast,
    canManageCredentials,
    canManageTeam,
    canWriteApplicationData,
};
