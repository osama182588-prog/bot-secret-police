const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const database = require('../database');

/**
 * أمر إعداد نظام الإجازات
 * يقوم بإنشاء الإمبيد الثابت في روم طلبات الإجازات
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('إعداد_نظام_الإجازات')
        .setDescription('إعداد نظام طلبات الإجازات (للإدارة فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const channelId = config.channels.leaveRequests;
            const channel = await client.channels.fetch(channelId);

            if (!channel) {
                return interaction.editReply({
                    content: '❌ لم يتم العثور على روم طلبات الإجازات. تأكد من إعدادات config.json'
                });
            }

            // التحقق من وجود إمبيد سابق
            const existingMessageId = database.getEmbedMessage(channelId);
            if (existingMessageId) {
                try {
                    const existingMessage = await channel.messages.fetch(existingMessageId);
                    await existingMessage.delete();
                } catch (error) {
                    console.log('لم يتم العثور على الرسالة السابقة، سيتم إنشاء واحدة جديدة');
                }
            }

            // إنشاء الإمبيد
            const embed = new EmbedBuilder()
                .setTitle('🎖️ نظام طلبات الإجازات - شرطة الديسكورد')
                .setDescription(
                    '**مرحباً بك في نظام طلبات الإجازات**\n\n' +
                    '📋 **كيفية تقديم طلب إجازة:**\n' +
                    '1️⃣ اضغط على زر "تقديم إجازة" أدناه\n' +
                    '2️⃣ املأ جميع الحقول المطلوبة بدقة\n' +
                    '3️⃣ انتظر موافقة الإدارة على طلبك\n\n' +
                    '⚠️ **تنبيهات مهمة:**\n' +
                    '• تأكد من صحة التواريخ المدخلة\n' +
                    '• اكتب سبب الإجازة بوضوح\n' +
                    '• ستصلك رسالة خاصة بنتيجة الطلب\n\n' +
                    '✨ نتمنى لك إجازة سعيدة!'
                )
                .setColor('#0099ff')
                .setTimestamp()
                .setFooter({ text: 'نظام إدارة الإجازات' });

            // إنشاء زر تقديم الإجازة
            const button = new ButtonBuilder()
                .setCustomId('submit_leave_request')
                .setLabel('📝 تقديم إجازة')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            // إرسال الرسالة
            const message = await channel.send({
                embeds: [embed],
                components: [row]
            });

            // حفظ معرف الرسالة في قاعدة البيانات
            database.saveEmbedMessage(channelId, message.id);

            await interaction.editReply({
                content: `✅ تم إعداد نظام الإجازات بنجاح في <#${channelId}>`
            });

        } catch (error) {
            console.error('خطأ في إعداد نظام الإجازات:', error);
            await interaction.editReply({
                content: '❌ حدث خطأ أثناء إعداد نظام الإجازات. تحقق من الصلاحيات والإعدادات.'
            });
        }
    }
};
