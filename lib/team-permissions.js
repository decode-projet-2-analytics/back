const TEAM_ROLE_RANKS = {
    member: 1,
    admin: 2,
    owner: 3,
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
    return isTeamRoleAtLeast(role, 'admin');
}

module.exports = {
    TEAM_ROLE_RANKS,
    isTeamRoleAtLeast,
    canManageCredentials,
    canManageTeam,
    canWriteApplicationData,
};
