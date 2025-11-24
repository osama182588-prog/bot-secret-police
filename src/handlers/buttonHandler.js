const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');
const db = require('../database/db');
const { t } = require('../utils/lang');
const { canManageLeaves, getMaxLeaveDuration } = require('../utils/permissions');
const config = require('../config');
const embeds = require('../utils/embeds');

async function handleButton(interaction, client) {
    const customId = interaction.customId;

    // Handle submit leave button
    if (customId === 'submit_leave') {
        await handleSubmitLeave(interaction);
        return;
    }

    // Handle approve button
    if (customId.startsWith('approve_')) {
        await handleApprove(interaction, client);
        return;
    }

    // Handle reject button
    if (customId.startsWith('reject_')) {
        await handleReject(interaction, client);
        return;
    }

    // Handle add note button
    if (customId.startsWith('addnote_')) {
        await handleAddNote(interaction);
        return;
    }

    // Handle pagination buttons
    if (customId.includes('_prev_') || customId.includes('_next_')) {
        await handlePagination(interaction);
        return;
    }
}

async function handleSubmitLeave(interaction) {
    // Check if system is locked
    if (db.isSystemLocked()) {
        return interaction.reply({
            content: t('messages.systemLocked'),
            ephemeral: true
        });
    }

    // Check spam protection
    const recentRequests = db.getRecentRequestsCount(interaction.user.id);
    if (recentRequests >= config.maxLeaveRequestsPerWeek) {
        return interaction.reply({
            content: t('messages.spamProtection', null, { maxRequests: config.maxLeaveRequestsPerWeek }),
            ephemeral: true
        });
    }

    // Show modal
    const modal = new ModalBuilder()
        .setCustomId('leave_request_modal')
        .setTitle(t('modal.leaveRequest.title'));

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(t('modal.leaveRequest.reasonLabel'))
        .setPlaceholder(t('modal.leaveRequest.reasonPlaceholder'))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel(t('modal.leaveRequest.durationLabel'))
        .setPlaceholder(t('modal.leaveRequest.durationPlaceholder'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3);

    const startDateInput = new TextInputBuilder()
        .setCustomId('start_date')
        .setLabel(t('modal.leaveRequest.startDateLabel'))
        .setPlaceholder(t('modal.leaveRequest.startDatePlaceholder'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    const endDateInput = new TextInputBuilder()
        .setCustomId('end_date')
        .setLabel(t('modal.leaveRequest.endDateLabel'))
        .setPlaceholder(t('modal.leaveRequest.endDatePlaceholder'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(startDateInput),
        new ActionRowBuilder().addComponents(endDateInput)
    );

    await interaction.showModal(modal);
}

async function handleApprove(interaction, client) {
    // Check permission
    if (!canManageLeaves(interaction.member)) {
        return interaction.reply({
            content: t('messages.noPermission'),
            ephemeral: true
        });
    }

    const requestId = interaction.customId.replace('approve_', '');
    const leave = db.getLeaveRequest(requestId);

    if (!leave) {
        return interaction.reply({
            content: t('messages.requestNotFound'),
            ephemeral: true
        });
    }

    if (leave.status !== 'pending') {
        return interaction.reply({
            content: '❌ This request has already been processed.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(leave.user_id).catch(() => null);

        // Create or find leave role
        const roleName = `إجازة - ${leave.duration} أيام`;
        let role = guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
            role = await guild.roles.create({
                name: roleName,
                color: 0x3498db,
                reason: `Leave role for ${leave.duration} days`
            });
        }

        // Assign role to member
        if (member) {
            await member.roles.add(role);
        }

        // Update database
        db.updateLeaveStatus(requestId, 'approved', interaction.user.id);
        db.updateLeaveRole(requestId, role.id);

        // Update the original message
        const approvedEmbed = embeds.createApprovedEmbed(leave, interaction.user.id);
        await interaction.message.edit({
            embeds: [approvedEmbed],
            components: []
        });

        // Send DM to user
        if (member) {
            try {
                await member.send({ embeds: [approvedEmbed] });
            } catch (err) {
                console.log('Could not send DM to user:', err.message);
            }
        }

        // Send to log channel
        const logChannel = guild.channels.cache.get(config.channels.leaveLog);
        if (logChannel) {
            const logEmbed = embeds.createLogStatusChangeEmbed(leave, 'pending', 'approved', interaction.user.id);
            await logChannel.send({ embeds: [logEmbed] });

            const roleLogEmbed = embeds.createLogRoleAssignedEmbed(leave, role.id);
            await logChannel.send({ embeds: [roleLogEmbed] });
        }

        await interaction.editReply({
            content: t('messages.requestApproved')
        });

    } catch (error) {
        console.error('Error approving leave:', error);
        await interaction.editReply({
            content: '❌ An error occurred while approving the request.'
        });
    }
}

async function handleReject(interaction, client) {
    // Check permission
    if (!canManageLeaves(interaction.member)) {
        return interaction.reply({
            content: t('messages.noPermission'),
            ephemeral: true
        });
    }

    const requestId = interaction.customId.replace('reject_', '');
    const leave = db.getLeaveRequest(requestId);

    if (!leave) {
        return interaction.reply({
            content: t('messages.requestNotFound'),
            ephemeral: true
        });
    }

    if (leave.status !== 'pending') {
        return interaction.reply({
            content: '❌ This request has already been processed.',
            ephemeral: true
        });
    }

    // Show modal for rejection reason
    const modal = new ModalBuilder()
        .setCustomId(`reject_modal_${requestId}`)
        .setTitle(t('modal.rejectReason.title'));

    const reasonInput = new TextInputBuilder()
        .setCustomId('rejection_reason')
        .setLabel(t('modal.rejectReason.reasonLabel'))
        .setPlaceholder(t('modal.rejectReason.reasonPlaceholder'))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
}

async function handleAddNote(interaction) {
    // Check permission
    if (!canManageLeaves(interaction.member)) {
        return interaction.reply({
            content: t('messages.noPermission'),
            ephemeral: true
        });
    }

    const requestId = interaction.customId.replace('addnote_', '');
    const leave = db.getLeaveRequest(requestId);

    if (!leave) {
        return interaction.reply({
            content: t('messages.requestNotFound'),
            ephemeral: true
        });
    }

    // Show modal for note
    const modal = new ModalBuilder()
        .setCustomId(`note_modal_${requestId}`)
        .setTitle(t('modal.addNote.title'));

    const noteInput = new TextInputBuilder()
        .setCustomId('note')
        .setLabel(t('modal.addNote.noteLabel'))
        .setPlaceholder(t('modal.addNote.notePlaceholder'))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(noteInput)
    );

    await interaction.showModal(modal);
}

async function handlePagination(interaction) {
    const parts = interaction.customId.split('_');
    const prefix = parts[0];
    const direction = parts[1];
    const currentPage = parseInt(parts[2]);

    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

    if (prefix === 'myrequests') {
        const result = db.getUserLeaves(interaction.user.id, newPage);
        const embed = embeds.createMyRequestsEmbed(result.leaves, newPage, result.pages);
        const buttons = embeds.createPaginationButtons(newPage, result.pages, 'myrequests');

        await interaction.update({
            embeds: [embed],
            components: result.pages > 1 ? [buttons] : []
        });
    }
}

module.exports = {
    handleButton
};
