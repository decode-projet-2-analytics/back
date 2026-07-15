const TEAM_ROLES = ['admin', 'member'];

function validateTeamRole(role) {
    return TEAM_ROLES.includes(role) ? role : null;
}

module.exports = { TEAM_ROLES, validateTeamRole };
