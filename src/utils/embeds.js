const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { t } = require('./lang');

// Create leave request embed (static embed in request channel)
function createLeaveRequestEmbed() {
    return new EmbedBuilder()
        .setTitle(t('embeds.leaveRequest.title'))
        .setDescription(t('embeds.leaveRequest.description'))
        .setColor(config.colors.primary)
        .setFooter({ text: t('embeds.leaveRequest.footer') })
        .setTimestamp();
}

// Create submit button
function createSubmitButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit_leave')
            .setLabel(t('buttons.submitLeave'))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
    );
}

// Create system locked embed
function createSystemLockedEmbed() {
    return new EmbedBuilder()
        .setTitle(t('embeds.systemLocked.title'))
        .setDescription(t('embeds.systemLocked.description'))
        .setColor(config.colors.danger)
        .setTimestamp();
}

// Create new request embed (for admin review)
function createNewRequestEmbed(leave, user) {
    return new EmbedBuilder()
        .setTitle(t('embeds.newRequest.title'))
        .setColor(config.colors.primary)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.newRequest.reason'), value: leave.reason, inline: false },
            { name: t('embeds.newRequest.duration'), value: `${leave.duration} ${t('embeds.newRequest.days')}`, inline: true },
            { name: t('embeds.newRequest.startDate'), value: leave.start_date, inline: true },
            { name: t('embeds.newRequest.endDate'), value: leave.end_date, inline: true },
            { name: t('embeds.newRequest.status'), value: t('embeds.newRequest.statusPending'), inline: false }
        )
        .setFooter({ text: t('embeds.newRequest.footer') })
        .setTimestamp()
        .setThumbnail(user?.displayAvatarURL() || null);
}

// Create admin action buttons
function createAdminButtons(requestId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_${requestId}`)
            .setLabel(t('buttons.approve'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('✔️'),
        new ButtonBuilder()
            .setCustomId(`reject_${requestId}`)
            .setLabel(t('buttons.reject'))
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌'),
        new ButtonBuilder()
            .setCustomId(`addnote_${requestId}`)
            .setLabel(t('buttons.addNote'))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📝')
    );
}

// Create approved embed (for user DM)
function createApprovedEmbed(leave, approvedBy) {
    return new EmbedBuilder()
        .setTitle(t('embeds.approved.title'))
        .setDescription(t('embeds.approved.description'))
        .setColor(config.colors.success)
        .addFields(
            { name: t('embeds.approved.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.approved.duration'), value: `${leave.duration} ${t('embeds.approved.days')}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.approved.startDate'), value: leave.start_date, inline: true },
            { name: t('embeds.approved.endDate'), value: leave.end_date, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.approved.reason'), value: leave.reason, inline: false },
            { name: t('embeds.approved.approvedBy'), value: `<@${approvedBy}>`, inline: false }
        )
        .setFooter({ text: t('embeds.approved.footer') })
        .setTimestamp();
}

// Create rejected embed (for user DM)
function createRejectedEmbed(leave, rejectedBy, adminNote = null) {
    const embed = new EmbedBuilder()
        .setTitle(t('embeds.rejected.title'))
        .setDescription(t('embeds.rejected.description'))
        .setColor(config.colors.danger)
        .addFields(
            { name: t('embeds.rejected.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.rejected.rejectedBy'), value: `<@${rejectedBy}>`, inline: true },
            { name: t('embeds.rejected.reason'), value: leave.reason, inline: false }
        )
        .setFooter({ text: t('embeds.rejected.footer') })
        .setTimestamp();

    if (adminNote) {
        embed.addFields({ name: t('embeds.rejected.adminNote'), value: adminNote, inline: false });
    }

    return embed;
}

// Create cancelled embed (for user DM)
function createCancelledEmbed(leave, cancelledBy) {
    return new EmbedBuilder()
        .setTitle(t('embeds.cancelled.title'))
        .setDescription(t('embeds.cancelled.description'))
        .setColor(config.colors.warning)
        .addFields(
            { name: t('embeds.cancelled.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.cancelled.cancelledBy'), value: `<@${cancelledBy}>`, inline: true }
        )
        .setFooter({ text: t('embeds.cancelled.footer') })
        .setTimestamp();
}

// Create log embed for new request
function createLogNewRequestEmbed(leave, user) {
    return new EmbedBuilder()
        .setTitle(t('embeds.log.newRequest'))
        .setColor(config.colors.info)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.newRequest.reason'), value: leave.reason, inline: false },
            { name: t('embeds.newRequest.duration'), value: `${leave.duration} ${t('embeds.newRequest.days')}`, inline: true },
            { name: t('embeds.newRequest.startDate'), value: leave.start_date, inline: true },
            { name: t('embeds.newRequest.endDate'), value: leave.end_date, inline: true },
            { name: t('embeds.log.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setThumbnail(user?.displayAvatarURL() || null)
        .setTimestamp();
}

// Create log embed for status change
function createLogStatusChangeEmbed(leave, oldStatus, newStatus, changedBy) {
    return new EmbedBuilder()
        .setTitle(t('embeds.log.statusChanged'))
        .setColor(config.colors.info)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.log.previousStatus'), value: t(`status.${oldStatus}`) || oldStatus, inline: true },
            { name: t('embeds.log.newStatus'), value: t(`status.${newStatus}`) || newStatus, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('embeds.log.changedBy'), value: `<@${changedBy}>`, inline: true },
            { name: t('embeds.log.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();
}

// Create log embed for note added
function createLogNoteAddedEmbed(leave, adminId, note) {
    return new EmbedBuilder()
        .setTitle(t('embeds.log.noteAdded'))
        .setColor(config.colors.info)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: t('modal.addNote.noteLabel'), value: note, inline: false },
            { name: t('embeds.log.changedBy'), value: `<@${adminId}>`, inline: true },
            { name: t('embeds.log.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();
}

// Create log embed for role assigned
function createLogRoleAssignedEmbed(leave, roleId) {
    return new EmbedBuilder()
        .setTitle(t('embeds.log.roleAssigned'))
        .setColor(config.colors.success)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: 'Role', value: `<@&${roleId}>`, inline: true },
            { name: t('embeds.log.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp();
}

// Create log embed for role removed
function createLogRoleRemovedEmbed(leave, roleId) {
    return new EmbedBuilder()
        .setTitle(t('embeds.log.roleRemoved'))
        .setColor(config.colors.warning)
        .addFields(
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: 'Role', value: roleId ? `<@&${roleId}>` : 'N/A', inline: true },
            { name: t('embeds.log.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp();
}

// Create notification embed
function createNotificationEmbed(leave, messageUrl) {
    return new EmbedBuilder()
        .setTitle(t('embeds.notification.newRequest'))
        .setDescription(t('embeds.notification.description'))
        .setColor(config.colors.warning)
        .addFields(
            { name: t('embeds.newRequest.applicant'), value: `<@${leave.user_id}>`, inline: true },
            { name: t('embeds.newRequest.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.newRequest.status'), value: t('embeds.newRequest.statusPending'), inline: true },
            { name: t('embeds.notification.clickToView'), value: `[Link](${messageUrl})`, inline: false }
        )
        .setTimestamp();
}

// Create reminder embed
function createReminderEmbed(leave) {
    return new EmbedBuilder()
        .setTitle(t('embeds.reminder.title'))
        .setDescription(t('embeds.reminder.description'))
        .setColor(config.colors.warning)
        .addFields(
            { name: t('embeds.reminder.requestId'), value: leave.request_id, inline: true },
            { name: t('embeds.reminder.endsOn'), value: leave.end_date, inline: true }
        )
        .setTimestamp();
}

// Create my requests embed
function createMyRequestsEmbed(leaves, page, totalPages) {
    if (leaves.length === 0) {
        return new EmbedBuilder()
            .setTitle(t('embeds.myRequests.title'))
            .setDescription(t('embeds.myRequests.noRequests'))
            .setColor(config.colors.primary)
            .setTimestamp();
    }

    const embed = new EmbedBuilder()
        .setTitle(t('embeds.myRequests.title'))
        .setColor(config.colors.primary)
        .setFooter({ text: `${t('embeds.myRequests.page')} ${page}/${totalPages}` })
        .setTimestamp();

    for (const leave of leaves) {
        embed.addFields({
            name: `${leave.request_id} - ${t(`status.${leave.status}`)}`,
            value: `**${t('embeds.newRequest.reason')}:** ${leave.reason}\n` +
                   `**${t('embeds.newRequest.duration')}:** ${leave.duration} ${t('embeds.newRequest.days')}\n` +
                   `**${t('embeds.newRequest.startDate')}:** ${leave.start_date}\n` +
                   `**${t('embeds.newRequest.endDate')}:** ${leave.end_date}\n` +
                   `**Created:** <t:${Math.floor(new Date(leave.created_at).getTime() / 1000)}:R>`,
            inline: false
        });
    }

    return embed;
}

// Create pagination buttons
function createPaginationButtons(page, totalPages, prefix) {
    const row = new ActionRowBuilder();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${prefix}_prev_${page}`)
            .setLabel(t('buttons.previous'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`${prefix}_next_${page}`)
            .setLabel(t('buttons.next'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
    );

    return row;
}

// Create statistics embed
function createStatisticsEmbed(stats) {
    return new EmbedBuilder()
        .setTitle(t('embeds.statistics.title'))
        .setColor(config.colors.primary)
        .addFields(
            { name: t('embeds.statistics.totalRequests'), value: stats.total.toString(), inline: true },
            { name: t('embeds.statistics.approved'), value: stats.approved.toString(), inline: true },
            { name: t('embeds.statistics.rejected'), value: stats.rejected.toString(), inline: true },
            { name: t('embeds.statistics.pending'), value: stats.pending.toString(), inline: true },
            { name: t('embeds.statistics.cancelled'), value: stats.cancelled.toString(), inline: true },
            { name: t('embeds.statistics.averageDuration'), value: `${stats.averageDuration} ${t('embeds.newRequest.days')}`, inline: true }
        )
        .setTimestamp();
}

// Create search result embed
function createSearchResultEmbed(leaves, page, totalPages) {
    if (leaves.length === 0) {
        return new EmbedBuilder()
            .setTitle(t('embeds.search.title'))
            .setDescription(t('embeds.search.noResults'))
            .setColor(config.colors.primary)
            .setTimestamp();
    }

    const embed = new EmbedBuilder()
        .setTitle(t('embeds.search.title'))
        .setColor(config.colors.primary)
        .setFooter({ text: `${t('embeds.myRequests.page')} ${page}/${totalPages}` })
        .setTimestamp();

    for (const leave of leaves) {
        embed.addFields({
            name: `${leave.request_id} - ${t(`status.${leave.status}`)}`,
            value: `**${t('embeds.newRequest.applicant')}:** <@${leave.user_id}>\n` +
                   `**${t('embeds.newRequest.reason')}:** ${leave.reason}\n` +
                   `**${t('embeds.newRequest.duration')}:** ${leave.duration} ${t('embeds.newRequest.days')}\n` +
                   `**${t('embeds.newRequest.startDate')}:** ${leave.start_date}\n` +
                   `**${t('embeds.newRequest.endDate')}:** ${leave.end_date}`,
            inline: false
        });
    }

    return embed;
}

module.exports = {
    createLeaveRequestEmbed,
    createSubmitButton,
    createSystemLockedEmbed,
    createNewRequestEmbed,
    createAdminButtons,
    createApprovedEmbed,
    createRejectedEmbed,
    createCancelledEmbed,
    createLogNewRequestEmbed,
    createLogStatusChangeEmbed,
    createLogNoteAddedEmbed,
    createLogRoleAssignedEmbed,
    createLogRoleRemovedEmbed,
    createNotificationEmbed,
    createReminderEmbed,
    createMyRequestsEmbed,
    createPaginationButtons,
    createStatisticsEmbed,
    createSearchResultEmbed
};
