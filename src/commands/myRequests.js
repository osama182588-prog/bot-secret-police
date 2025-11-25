const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-requests')
        .setDescription('View your previous leave requests / عرض طلباتي السابقة'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const result = db.getUserLeaves(interaction.user.id, 1);
        const embed = embeds.createMyRequestsEmbed(result.leaves, 1, result.pages);

        const components = [];
        if (result.pages > 1) {
            components.push(embeds.createPaginationButtons(1, result.pages, 'myrequests'));
        }

        await interaction.editReply({
            embeds: [embed],
            components
        });
    }
};
