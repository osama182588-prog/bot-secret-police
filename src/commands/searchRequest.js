const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search-request')
        .setDescription('Search for leave requests / البحث عن طلبات الإجازة')
        .addStringOption(option =>
            option.setName('request_id')
                .setDescription('Request ID (e.g., PL-0001) / رقم الطلب')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Member to search for / العضو للبحث عنه')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter by status / تصفية حسب الحالة')
                .setRequired(false)
                .addChoices(
                    { name: 'Pending / قيد المراجعة', value: 'pending' },
                    { name: 'Approved / مقبول', value: 'approved' },
                    { name: 'Rejected / مرفوض', value: 'rejected' },
                    { name: 'Cancelled / ملغى', value: 'cancelled' }
                )
        )
        .addStringOption(option =>
            option.setName('start_date')
                .setDescription('Start date (YYYY-MM-DD) / تاريخ البداية')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('end_date')
                .setDescription('End date (YYYY-MM-DD) / تاريخ النهاية')
                .setRequired(false)
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
        const member = interaction.options.getUser('member');
        const status = interaction.options.getString('status');
        const startDate = interaction.options.getString('start_date');
        const endDate = interaction.options.getString('end_date');

        const options = {
            limit: 10
        };

        if (requestId) options.requestId = requestId;
        if (member) options.userId = member.id;
        if (status) options.status = status;
        if (startDate) options.startDateFrom = startDate;
        if (endDate) options.startDateTo = endDate;

        const leaves = db.searchLeaves(options);
        const embed = embeds.createSearchResultEmbed(leaves, 1, 1);

        await interaction.editReply({
            embeds: [embed]
        });
    }
};
