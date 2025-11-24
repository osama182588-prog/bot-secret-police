const config = require('../config');

// Check if member has admin permission
function hasAdminPermission(member) {
    // Check if member has administrator permission
    if (member.permissions.has('Administrator')) {
        return true;
    }

    // Check if member has ManageRoles permission
    if (member.permissions.has('ManageRoles')) {
        return true;
    }

    // Check if member has the configured admin role
    if (config.roles.admin && member.roles.cache.has(config.roles.admin)) {
        return true;
    }

    return false;
}

// Check if member can manage leaves
function canManageLeaves(member) {
    return hasAdminPermission(member);
}

// Get max leave duration for member based on roles
function getMaxLeaveDuration(member) {
    const roleLimits = config.roleDurationLimits;

    if (!roleLimits || Object.keys(roleLimits).length === 0) {
        return null; // No limits configured
    }

    // Find the highest limit among member's roles
    let maxDuration = null;

    for (const [roleId, limit] of Object.entries(roleLimits)) {
        if (member.roles.cache.has(roleId)) {
            if (maxDuration === null || limit > maxDuration) {
                maxDuration = limit;
            }
        }
    }

    return maxDuration;
}

module.exports = {
    hasAdminPermission,
    canManageLeaves,
    getMaxLeaveDuration
};
