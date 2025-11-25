const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');
const config = require('../config');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('الغاء_اجازة')
        .setDescription('Cancel an existing leave')
        .addStringOption(option =>
            option.setName('request_id')
                .setDescription('Request ID to cancel (e.g., PL-0001)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        if (!canManageLeaves(interaction.member)) {
            return interaction.reply({
                content: t('messages.noPermission'),
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const requestId = interaction.options.getString('request_id');
        const leave = db.getLeaveRequest(requestId);

        if (!leave) {
            return interaction.editReply({
                content: t('messages.requestNotFound')
            });
        }

        if (leave.status !== 'approved') {
            return interaction.editReply({
                content: t('messages.onlyApprovedCanBeCancelled')
            });
        }

        try {
            const guild = interaction.guild;
            const member = await guild.members.fetch(leave.user_id).catch(() => null);

            // Remove leave role from member
            if (member && leave.role_id) {
                try {
                    await member.roles.remove(leave.role_id);
                } catch (err) {
                    console.log('Could not remove role:', err.message);
                }
            }

            // Update database
            db.updateLeaveStatus(requestId, 'cancelled', interaction.user.id);

            // Send DM to user
            if (member) {
                try {
                    const cancelledEmbed = embeds.createCancelledEmbed(leave, interaction.user.id);
                    await member.send({ embeds: [cancelledEmbed] });
                } catch (err) {
                    console.log('Could not send DM to user:', err.message);
                }
            }

            // Send to log channel
            const logChannel = guild.channels.cache.get(config.channels.leaveLog);
            if (logChannel) {
                const logEmbed = embeds.createLogStatusChangeEmbed(leave, 'approved', 'cancelled', interaction.user.id);
                await logChannel.send({ embeds: [logEmbed] });

                if (leave.role_id) {
                    const roleRemovedEmbed = embeds.createLogRoleRemovedEmbed(leave, leave.role_id);
                    await logChannel.send({ embeds: [roleRemovedEmbed] });
                }
            }

            await interaction.editReply({
                content: t('messages.requestCancelled')
            });

        } catch (error) {
            console.error('Error cancelling leave:', error);
            await interaction.editReply({
                content: '❌ An error occurred while cancelling the leave.'
            });
        }
    }
};
