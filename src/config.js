require('dotenv').config();

module.exports = {
    // Bot Token
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    // Channels
    channels: {
        leaveRequest: process.env.LEAVE_REQUEST_CHANNEL_ID,
        leaveReview: process.env.LEAVE_REVIEW_CHANNEL_ID,
        leaveLog: process.env.LEAVE_LOG_CHANNEL_ID,
        notification: process.env.NOTIFICATION_CHANNEL_ID
    },

    // Roles
    roles: {
        admin: process.env.ADMIN_ROLE_ID,
        notification: process.env.NOTIFICATION_ROLE_ID,
        rejectedLeave: process.env.REJECTED_LEAVE_ROLE_ID
    },

    // Language
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'ar',

    // Leave Settings
    maxLeaveRequestsPerWeek: parseInt(process.env.MAX_LEAVE_REQUESTS_PER_WEEK) || 2,
    reminderHoursBeforeEnd: parseInt(process.env.REMINDER_HOURS_BEFORE_END) || 24,

    // Role Duration Limits (days) by role ID
    // Example: { 'roleId1': 7, 'roleId2': 10 }
    roleDurationLimits: {},

    // Two-step approval enabled
    twoStepApproval: false,

    // Embed Colors
    colors: {
        primary: 0x3498db,
        success: 0x2ecc71,
        warning: 0xf39c12,
        danger: 0xe74c3c,
        info: 0x9b59b6
    }
};
