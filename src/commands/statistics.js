const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('احصائيات_الإجازات')
        .setDescription('عرض إحصائيات الإجازات')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('الفترة الزمنية للإحصائيات')
                .setRequired(false)
                .addChoices(
                    { name: 'الكل', value: 'all' },
                    { name: 'آخر شهر', value: 'month' },
                    { name: 'آخر أسبوع', value: 'week' }
                )
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

        const period = interaction.options.getString('period') || 'all';
        
        let startDate = null;
        let endDate = null;

        if (period !== 'all') {
            const now = new Date();
            endDate = now.toISOString();

            if (period === 'month') {
                now.setMonth(now.getMonth() - 1);
            } else if (period === 'week') {
                now.setDate(now.getDate() - 7);
            }
            startDate = now.toISOString();
        }

        const stats = db.getStatistics(startDate, endDate);
        const embed = embeds.createStatisticsEmbed(stats);

        // Add top members if any
        if (stats.topMembers && stats.topMembers.length > 0) {
            let topList = '';
            for (let i = 0; i < stats.topMembers.length; i++) {
                const member = stats.topMembers[i];
                topList += `${i + 1}. <@${member.user_id}> - ${member.count} leaves\n`;
            }
            embed.addFields({
                name: t('embeds.statistics.topMembers'),
                value: topList || 'N/A',
                inline: false
            });
        }

        await interaction.editReply({
            embeds: [embed]
        });
    }
};
