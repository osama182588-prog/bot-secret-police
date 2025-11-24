const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');

/**
 * أمر عرض طلبات العضو
 * يعرض جميع الطلبات السابقة للعضو
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('طلباتي')
        .setDescription('عرض جميع طلباتك السابقة'),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const userId = interaction.user.id;
            const requests = database.getUserRequests(userId);

            if (requests.length === 0) {
                return interaction.editReply({
                    content: '📭 لم تقم بتقديم أي طلبات إجازة بعد.'
                });
            }

            // ترتيب الطلبات من الأحدث للأقدم
            requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            // إنشاء إمبيد لكل طلب (حد أقصى 10 طلبات)
            const embeds = [];
            const maxRequests = Math.min(requests.length, 10);

            for (let i = 0; i < maxRequests; i++) {
                const request = requests[i];
                
                // تحديد اللون حسب الحالة
                let color = '#ffa500'; // برتقالي للطلبات قيد المراجعة
                if (request.status === 'مقبول') color = '#00ff00'; // أخضر
                if (request.status === 'مرفوض') color = '#ff0000'; // أحمر

                // تحديد الأيقونة حسب الحالة
                let statusIcon = '⏳';
                if (request.status === 'مقبول') statusIcon = '✅';
                if (request.status === 'مرفوض') statusIcon = '❌';

                const embed = new EmbedBuilder()
                    .setTitle(`${statusIcon} طلب إجازة #${request.id}`)
                    .setColor(color)
                    .addFields(
                        { name: '📝 السبب', value: request.reason || 'غير محدد', inline: false },
                        { name: '⏱️ المدة', value: `${request.duration} يوم/أيام`, inline: true },
                        { name: '📊 الحالة', value: request.status, inline: true },
                        { name: '📅 من', value: request.startDate, inline: true },
                        { name: '📅 إلى', value: request.endDate, inline: true },
                        { name: '🕐 تاريخ التقديم', value: new Date(request.submittedAt).toLocaleString('ar-SA'), inline: false }
                    );

                // إضافة معلومات إضافية إذا تمت معالجة الطلب
                if (request.processedAt) {
                    embed.addFields({
                        name: '🕐 تاريخ المعالجة',
                        value: new Date(request.processedAt).toLocaleString('ar-SA'),
                        inline: false
                    });
                }

                // إضافة الرتبة إذا تم قبول الطلب
                if (request.role) {
                    embed.addFields({
                        name: '🎖️ الرتبة الممنوحة',
                        value: request.role,
                        inline: false
                    });
                }

                embeds.push(embed);
            }

            // إرسال الطلبات
            await interaction.editReply({
                content: `📊 **إجمالي طلباتك:** ${requests.length} طلب\n${requests.length > 10 ? '(يتم عرض أحدث 10 طلبات فقط)' : ''}`,
                embeds: embeds
            });

        } catch (error) {
            console.error('خطأ في عرض الطلبات:', error);
            await interaction.editReply({
                content: '❌ حدث خطأ أثناء جلب طلباتك.'
            });
        }
    }
};
