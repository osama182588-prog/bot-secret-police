const db = require('../database/db');
const { t } = require('../utils/lang');
const { canManageLeaves, getMaxLeaveDuration } = require('../utils/permissions');
const config = require('../config');
const embeds = require('../utils/embeds');

async function handleModal(interaction, client) {
    const customId = interaction.customId;

    // Handle leave request modal
    if (customId === 'leave_request_modal') {
        await handleLeaveRequestSubmission(interaction, client);
        return;
    }

    // Handle rejection reason modal
    if (customId.startsWith('reject_modal_')) {
        await handleRejectionSubmission(interaction, client);
        return;
    }

    // Handle note modal
    if (customId.startsWith('note_modal_')) {
        await handleNoteSubmission(interaction, client);
        return;
    }
}

async function handleLeaveRequestSubmission(interaction, client) {
    const reason = interaction.fields.getTextInputValue('reason');
    const durationStr = interaction.fields.getTextInputValue('duration');
    const startDate = interaction.fields.getTextInputValue('start_date');
    const endDate = interaction.fields.getTextInputValue('end_date');

    // Validate duration
    const duration = parseInt(durationStr);
    if (isNaN(duration) || duration <= 0) {
        return interaction.reply({
            content: '❌ Please enter a valid number of days.',
            ephemeral: true
        });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return interaction.reply({
            content: t('messages.invalidDate'),
            ephemeral: true
        });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return interaction.reply({
            content: t('messages.invalidDate'),
            ephemeral: true
        });
    }

    // Check if start date is in the past
    if (start < today) {
        return interaction.reply({
            content: t('messages.startDatePast'),
            ephemeral: true
        });
    }

    // Check if end date is before start date
    if (end < start) {
        return interaction.reply({
            content: t('messages.endDateBeforeStart'),
            ephemeral: true
        });
    }

    // Calculate actual duration
    const diffTime = Math.abs(end - start);
    const actualDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check if entered duration matches calculated duration
    if (duration !== actualDuration) {
        return interaction.reply({
            content: t('messages.durationMismatch') + `\n(Calculated: ${actualDuration} days)`,
            ephemeral: true
        });
    }

    // Check for overlapping leaves
    const overlapping = db.checkOverlappingLeave(interaction.user.id, startDate, endDate);
    if (overlapping) {
        return interaction.reply({
            content: t('messages.overlappingLeave', null, {
                requestId: overlapping.request_id,
                startDate: overlapping.start_date,
                endDate: overlapping.end_date
            }),
            ephemeral: true
        });
    }

    // Check max duration for user's role
    const maxDuration = getMaxLeaveDuration(interaction.member);
    if (maxDuration !== null && duration > maxDuration) {
        return interaction.reply({
            content: t('messages.maxDurationExceeded', null, { maxDays: maxDuration }),
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Create leave request in database
        const requestId = db.createLeaveRequest(
            interaction.user.id,
            interaction.user.username,
            reason,
            duration,
            startDate,
            endDate
        );

        const leave = db.getLeaveRequest(requestId);

        // Send request to review channel
        const reviewChannel = interaction.guild.channels.cache.get(config.channels.leaveReview);
        if (reviewChannel) {
            const requestEmbed = embeds.createNewRequestEmbed(leave, interaction.user);
            const adminButtons = embeds.createAdminButtons(requestId);

            const message = await reviewChannel.send({
                content: `<@${leave.user_id}>`,
                embeds: [requestEmbed],
                components: [adminButtons]
            });

            // Update message ID in database
            db.updateLeaveMessage(requestId, message.id, reviewChannel.id);

            // Send notification
            const notificationChannel = interaction.guild.channels.cache.get(config.channels.notification);
            if (notificationChannel && config.roles.notification) {
                const notificationEmbed = embeds.createNotificationEmbed(leave, message.url);
                await notificationChannel.send({
                    content: `<@&${config.roles.notification}>`,
                    embeds: [notificationEmbed]
                });
            }
        }

        // Send to log channel
        const logChannel = interaction.guild.channels.cache.get(config.channels.leaveLog);
        if (logChannel) {
            const logEmbed = embeds.createLogNewRequestEmbed(leave, interaction.user);
            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({
            content: t('messages.requestSubmitted', null, { requestId })
        });

    } catch (error) {
        console.error('Error submitting leave request:', error);
        await interaction.editReply({
            content: '❌ An error occurred while submitting your request.'
        });
    }
}

async function handleRejectionSubmission(interaction, client) {
    const requestId = interaction.customId.replace('reject_modal_', '');
    const rejectionReason = interaction.fields.getTextInputValue('rejection_reason') || null;

    const leave = db.getLeaveRequest(requestId);

    if (!leave) {
        return interaction.reply({
            content: t('messages.requestNotFound'),
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(leave.user_id).catch(() => null);

        // Update database
        db.updateLeaveStatus(requestId, 'rejected', interaction.user.id, rejectionReason);

        // Assign rejected role if configured
        if (config.roles.rejectedLeave && member) {
            try {
                await member.roles.add(config.roles.rejectedLeave);
            } catch (err) {
                console.log('Could not add rejected role:', err.message);
            }
        }

        // Update the original message
        const updatedLeave = db.getLeaveRequest(requestId);
        const rejectedEmbed = embeds.createRejectedEmbed(updatedLeave, interaction.user.id, rejectionReason);

        // Find and update the original message
        const reviewChannel = guild.channels.cache.get(leave.channel_id);
        if (reviewChannel && leave.message_id) {
            try {
                const message = await reviewChannel.messages.fetch(leave.message_id);
                await message.edit({
                    embeds: [rejectedEmbed],
                    components: []
                });
            } catch (err) {
                console.log('Could not update original message:', err.message);
            }
        }

        // Send DM to user
        if (member) {
            try {
                await member.send({ embeds: [rejectedEmbed] });
            } catch (err) {
                console.log('Could not send DM to user:', err.message);
            }
        }

        // Send to log channel
        const logChannel = guild.channels.cache.get(config.channels.leaveLog);
        if (logChannel) {
            const logEmbed = embeds.createLogStatusChangeEmbed(leave, 'pending', 'rejected', interaction.user.id);
            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({
            content: t('messages.requestRejected')
        });

    } catch (error) {
        console.error('Error rejecting leave:', error);
        await interaction.editReply({
            content: '❌ An error occurred while rejecting the request.'
        });
    }
}

async function handleNoteSubmission(interaction, client) {
    const requestId = interaction.customId.replace('note_modal_', '');
    const note = interaction.fields.getTextInputValue('note');

    const leave = db.getLeaveRequest(requestId);

    if (!leave) {
        return interaction.reply({
            content: t('messages.requestNotFound'),
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Add note to database
        db.addNote(requestId, interaction.user.id, interaction.user.username, note);

        // Send to log channel
        const guild = interaction.guild;
        const logChannel = guild.channels.cache.get(config.channels.leaveLog);
        if (logChannel) {
            const logEmbed = embeds.createLogNoteAddedEmbed(leave, interaction.user.id, note);
            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({
            content: t('messages.noteAdded')
        });

    } catch (error) {
        console.error('Error adding note:', error);
        await interaction.editReply({
            content: '❌ An error occurred while adding the note.'
        });
    }
}

module.exports = {
    handleModal
};
