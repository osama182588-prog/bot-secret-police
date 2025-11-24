const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database');
const config = require('../config.json');

/**
 * أمر إضافة ملاحظة إدارية على طلب
 * يسمح للإدارة بإضافة ملاحظات داخلية
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ملاحظة')
        .setDescription('إضافة ملاحظة إدارية على طلب إجازة (للإدارة فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption(option =>
            option.setName('رقم_الطلب')
                .setDescription('رقم معرف الطلب')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('الملاحظة')
                .setDescription('الملاحظة الإدارية')
                .setRequired(true)
        ),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const requestId = interaction.options.getString('رقم_الطلب');
            const noteText = interaction.options.getString('الملاحظة');

            const request = database.getRequest(requestId);

            if (!request) {
                return interaction.editReply({
                    content: '❌ لم يتم العثور على طلب بهذا المعرف.'
                });
            }

            // إضافة الملاحظة
            database.addAdminNote(
                requestId,
                noteText,
                interaction.user.id,
                interaction.user.tag
            );

            // إرسال تأكيد للمسؤول
            await interaction.editReply({
                content: `✅ تم إضافة الملاحظة بنجاح على طلب #${requestId}`
            });

            // إرسال إلى روم اللوغ
            try {
                const logChannel = await client.channels.fetch(config.channels.logs);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📝 ملاحظة إدارية جديدة')
                        .setColor('#ffa500')
                        .addFields(
                            { name: '🆔 رقم الطلب', value: `#${requestId}`, inline: true },
                            { name: '👤 العضو', value: `<@${request.userId}>`, inline: true },
                            { name: '👮 المسؤول', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '📝 الملاحظة', value: noteText, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'نظام طلبات الإجازات' });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('خطأ في إرسال اللوغ:', error);
            }

        } catch (error) {
            console.error('خطأ في إضافة الملاحظة:', error);
            await interaction.editReply({
                content: '❌ حدث خطأ أثناء إضافة الملاحظة.'
            });
        }
    }
};
