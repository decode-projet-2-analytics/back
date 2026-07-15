function canGlobalRoleListAllApplications(globalRole) {
    return globalRole === 'Admin';
}

function canGlobalRoleAccessApplicationDetails(globalRole) {
    return globalRole !== 'Admin';
}

module.exports = {
    canGlobalRoleListAllApplications,
    canGlobalRoleAccessApplicationDetails,
};
