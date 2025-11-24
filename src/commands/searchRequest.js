const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('البحث_عن_طلب')
        .setDescription('البحث عن طلبات الإجازة')
        .addStringOption(option =>
            option.setName('request_id')
                .setDescription('رقم الطلب (مثال: PL-0001)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member')
                .setDescription('العضو المراد البحث عنه')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('تصفية حسب الحالة')
                .setRequired(false)
                .addChoices(
                    { name: 'قيد المراجعة', value: 'pending' },
                    { name: 'مقبول', value: 'approved' },
                    { name: 'مرفوض', value: 'rejected' },
                    { name: 'ملغى', value: 'cancelled' }
                )
        )
        .addStringOption(option =>
            option.setName('start_date')
                .setDescription('تاريخ البداية (YYYY-MM-DD)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('end_date')
                .setDescription('تاريخ النهاية (YYYY-MM-DD)')
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
