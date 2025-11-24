const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database');

/**
 * أمر عرض سجل الإجازات (للإدارة)
 * يعرض جميع الطلبات في النظام
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('سجل_الإجازات')
        .setDescription('عرض سجل جميع طلبات الإجازات (للإدارة فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption(option =>
            option.setName('الحالة')
                .setDescription('تصفية حسب الحالة')
                .setRequired(false)
                .addChoices(
                    { name: 'جميع الطلبات', value: 'all' },
                    { name: 'قيد المراجعة', value: 'قيد المراجعة' },
                    { name: 'مقبول', value: 'مقبول' },
                    { name: 'مرفوض', value: 'مرفوض' }
                )
        ),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const statusFilter = interaction.options.getString('الحالة') || 'all';
            let requests = database.getAllRequests();

            // تصفية حسب الحالة
            if (statusFilter !== 'all') {
                requests = requests.filter(r => r.status === statusFilter);
            }

            if (requests.length === 0) {
                return interaction.editReply({
                    content: `📭 لا توجد طلبات ${statusFilter !== 'all' ? `بحالة "${statusFilter}"` : 'في النظام'}.`
                });
            }

            // ترتيب الطلبات من الأحدث للأقدم
            requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            // إنشاء إمبيد ملخص
            const summaryEmbed = new EmbedBuilder()
                .setTitle('📊 سجل طلبات الإجازات')
                .setColor('#0099ff')
                .setDescription(`**إجمالي الطلبات:** ${requests.length}`)
                .setTimestamp();

            // إحصائيات
            const pending = requests.filter(r => r.status === 'قيد المراجعة').length;
            const accepted = requests.filter(r => r.status === 'مقبول').length;
            const rejected = requests.filter(r => r.status === 'مرفوض').length;

            summaryEmbed.addFields(
                { name: '⏳ قيد المراجعة', value: `${pending}`, inline: true },
                { name: '✅ مقبول', value: `${accepted}`, inline: true },
                { name: '❌ مرفوض', value: `${rejected}`, inline: true }
            );

            // إنشاء قائمة بالطلبات (حد أقصى 5 طلبات)
            let description = '\n**آخر الطلبات:**\n\n';
            const maxDisplay = Math.min(requests.length, 5);

            for (let i = 0; i < maxDisplay; i++) {
                const request = requests[i];
                const statusIcon = request.status === 'مقبول' ? '✅' : request.status === 'مرفوض' ? '❌' : '⏳';
                
                description += `${statusIcon} **#${request.id}** - <@${request.userId}>\n`;
                description += `└ السبب: ${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}\n`;
                description += `└ المدة: ${request.duration} يوم | من ${request.startDate} إلى ${request.endDate}\n`;
                description += `└ الحالة: ${request.status}\n\n`;
            }

            if (requests.length > 5) {
                description += `*... وهناك ${requests.length - 5} طلب آخر*`;
            }

            summaryEmbed.setDescription(summaryEmbed.data.description + '\n' + description);

            await interaction.editReply({
                embeds: [summaryEmbed]
            });

        } catch (error) {
            console.error('خطأ في عرض سجل الإجازات:', error);
            await interaction.editReply({
                content: '❌ حدث خطأ أثناء جلب سجل الإجازات.'
            });
        }
    }
};
