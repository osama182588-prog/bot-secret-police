const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');
const embeds = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock-leaves')
        .setDescription('Lock the leave system / قفل نظام الإجازات')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!canManageLeaves(interaction.member)) {
            return interaction.reply({
                content: t('messages.noPermission'),
                ephemeral: true
            });
        }

        db.setSystemLocked(true);

        // Try to update the leave request channel embed
        try {
            const channel = interaction.guild.channels.cache.get(config.channels.leaveRequest);
            if (channel) {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessage = messages.find(m => 
                    m.author.id === interaction.client.user.id && 
                    m.embeds.length > 0
                );

                if (botMessage) {
                    const lockedEmbed = embeds.createSystemLockedEmbed();
                    await botMessage.edit({
                        embeds: [lockedEmbed],
                        components: []
                    });
                }
            }
        } catch (err) {
            console.log('Could not update channel embed:', err.message);
        }

        await interaction.reply({
            content: t('messages.systemLockedSuccess'),
            ephemeral: true
        });
    }
};
