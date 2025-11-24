const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const db = require('../database/db');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('تصدير_الإجازات')
        .setDescription('تصدير بيانات الإجازات')
        .addStringOption(option =>
            option.setName('format')
                .setDescription('صيغة التصدير')
                .setRequired(true)
                .addChoices(
                    { name: 'CSV', value: 'csv' },
                    { name: 'JSON', value: 'json' }
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!canManageLeaves(interaction.member)) {
            return interaction.reply({
                content: t('messages.noPermission'),
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const format = interaction.options.getString('format');
        const startDate = interaction.options.getString('start_date');
        const endDate = interaction.options.getString('end_date');

        const leaves = db.getAllLeaves(startDate, endDate);

        let content;
        let filename;

        if (format === 'csv') {
            // Helper function to escape CSV values
            const escapeCsvValue = (value) => {
                if (value === null || value === undefined) return '';
                const strValue = String(value);
                if (strValue.includes('"') || strValue.includes(',') || strValue.includes('\n')) {
                    return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
            };

            // Generate CSV
            const headers = [
                'Request ID',
                'User ID',
                'Username',
                'Reason',
                'Duration',
                'Start Date',
                'End Date',
                'Status',
                'Role ID',
                'Created At',
                'Updated At',
                'Processed By',
                'Processed At',
                'Rejection Reason'
            ];

            const rows = leaves.map(leave => [
                leave.request_id,
                leave.user_id,
                leave.username,
                escapeCsvValue(leave.reason),
                leave.duration,
                leave.start_date,
                leave.end_date,
                leave.status,
                leave.role_id || '',
                leave.created_at,
                leave.updated_at,
                leave.processed_by || '',
                leave.processed_at || '',
                escapeCsvValue(leave.rejection_reason)
            ]);

            content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            filename = `leaves_export_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            // Generate JSON
            content = JSON.stringify(leaves, null, 2);
            filename = `leaves_export_${new Date().toISOString().split('T')[0]}.json`;
        }

        const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: filename });

        await interaction.editReply({
            content: t('messages.exportSuccess'),
            files: [attachment]
        });
    }
};
