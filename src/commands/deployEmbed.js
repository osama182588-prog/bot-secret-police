const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { t } = require('../utils/lang');
const embeds = require('../utils/embeds');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploy-embed')
        .setDescription('Deploy the leave request embed / نشر إمبيد طلب الإجازة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.guild.channels.cache.get(config.channels.leaveRequest);

        if (!channel) {
            return interaction.reply({
                content: t('messages.channelNotFound'),
                ephemeral: true
            });
        }

        const isLocked = db.isSystemLocked();
        let embed, components;

        if (isLocked) {
            embed = embeds.createSystemLockedEmbed();
            components = [];
        } else {
            embed = embeds.createLeaveRequestEmbed();
            components = [embeds.createSubmitButton()];
        }

        await channel.send({
            embeds: [embed],
            components
        });

        await interaction.reply({
            content: t('messages.embedDeployed'),
            ephemeral: true
        });
    }
};
