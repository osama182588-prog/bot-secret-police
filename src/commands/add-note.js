const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-note')
        .setDescription('Add a note to a leave request')
        .addStringOption(option =>
            option.setName('request_id')
                .setDescription('Request ID (e.g., PL-0001)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('note')
                .setDescription('Note to add')
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

        const requestId = interaction.options.getString('request_id');
        const noteText = interaction.options.getString('note');

        try {
            const leave = db.getLeaveRequest(requestId);

            if (!leave) {
                return interaction.reply({
                    content: t('messages.requestNotFound'),
                    ephemeral: true
                });
            }

            db.addNote(requestId, interaction.user.id, interaction.user.username, noteText);

            await interaction.reply({
                content: t('messages.noteAdded'),
                ephemeral: true
            });
        } catch (error) {
            console.error('Error adding note:', error);
            await interaction.reply({
                content: t('messages.genericError'),
                ephemeral: true
            });
        }
    }
};
