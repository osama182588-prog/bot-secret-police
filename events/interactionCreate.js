const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');
const config = require('../config.json');
const utils = require('../utils');

/**
 * معالج تفاعلات الأزرار والنماذج
 * يدير جميع التفاعلات مع الأزرار والنماذج في النظام
 */
module.exports = {
    name: Events.InteractionCreate,
    
    async execute(interaction, client) {
        // معالجة ضغطات الأزرار
        if (interaction.isButton()) {
            await handleButton(interaction, client);
        }
        
        // معالجة إرسال النماذج
        if (interaction.isModalSubmit()) {
            await handleModal(interaction, client);
        }
    }
};

/**
 * معالجة ضغطات الأزرار
 */
async function handleButton(interaction, client) {
    const { customId } = interaction;

    try {
        // زر تقديم طلب إجازة
        if (customId === 'submit_leave_request') {
            await showLeaveRequestModal(interaction);
        }
        
        // زر قبول الطلب
        if (customId.startsWith('accept_leave_')) {
            await acceptLeaveRequest(interaction, client);
        }
        
        // زر رفض الطلب
        if (customId.startsWith('reject_leave_')) {
            await rejectLeaveRequest(interaction, client);
        }

    } catch (error) {
        console.error('خطأ في معالجة الزر:', error);
        
        const errorMessage = { content: '❌ حدث خطأ أثناء معالجة طلبك.', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * عرض نموذج تقديم طلب الإجازة
 */
async function showLeaveRequestModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('leave_request_modal')
        .setTitle('تقديم طلب إجازة');

    // حقل سبب الإجازة
    const reasonInput = new TextInputBuilder()
        .setCustomId('leave_reason')
        .setLabel('سبب الإجازة')
        .setPlaceholder('اذكر سبب طلب الإجازة بوضوح...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(500);

    // حقل مدة الإجازة
    const durationInput = new TextInputBuilder()
        .setCustomId('leave_duration')
        .setLabel('مدة الإجازة (بالأيام)')
        .setPlaceholder('مثال: 7')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);

    // حقل تاريخ البداية
    const startDateInput = new TextInputBuilder()
        .setCustomId('leave_start_date')
        .setLabel('تاريخ بداية الإجازة (YYYY-MM-DD)')
        .setPlaceholder('مثال: 2024-12-25')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(10);

    // حقل تاريخ النهاية
    const endDateInput = new TextInputBuilder()
        .setCustomId('leave_end_date')
        .setLabel('تاريخ نهاية الإجازة (YYYY-MM-DD)')
        .setPlaceholder('مثال: 2025-01-01')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(10);

    // إضافة الحقول إلى النموذج
    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(startDateInput),
        new ActionRowBuilder().addComponents(endDateInput)
    );

    await interaction.showModal(modal);
}

/**
 * معالجة إرسال النموذج
 */
async function handleModal(interaction, client) {
    if (interaction.customId === 'leave_request_modal') {
        await processLeaveRequest(interaction, client);
    }
}

/**
 * معالجة طلب الإجازة المقدم
 */
async function processLeaveRequest(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // الحصول على البيانات من النموذج
        const reason = interaction.fields.getTextInputValue('leave_reason');
        const duration = interaction.fields.getTextInputValue('leave_duration');
        const startDate = interaction.fields.getTextInputValue('leave_start_date');
        const endDate = interaction.fields.getTextInputValue('leave_end_date');

        // التحقق من صحة المدة
        if (!utils.isPositiveInteger(duration)) {
            return interaction.editReply({
                content: '❌ يجب أن تكون مدة الإجازة رقماً صحيحاً موجباً.'
            });
        }

        // التحقق من صحة التواريخ
        if (!utils.isValidDateFormat(startDate) || !utils.isValidDateFormat(endDate)) {
            return interaction.editReply({
                content: '❌ يجب أن تكون التواريخ بصيغة YYYY-MM-DD (مثال: 2024-12-25)'
            });
        }

        // التحقق من أن تاريخ النهاية بعد تاريخ البداية
        if (new Date(endDate) <= new Date(startDate)) {
            return interaction.editReply({
                content: '❌ تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية.'
            });
        }

        // إرسال الطلب إلى روم الإدارة
        const managementChannel = await client.channels.fetch(config.channels.management);
        
        if (!managementChannel) {
            return interaction.editReply({
                content: `❌ خطأ في النظام: لم يتم العثور على روم الإدارة (ID: ${config.channels.management}). تحقق من config.json`
            });
        }

        // إنشاء إمبيد للإدارة
        const managementEmbed = new EmbedBuilder()
            .setTitle('📋 طلب إجازة جديد')
            .setColor('#ffa500')
            .setDescription(`**طلب جديد بانتظار المراجعة**`)
            .addFields(
                { name: '👤 مقدم الطلب', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🆔 معرف المستخدم', value: interaction.user.id, inline: true },
                { name: '📝 السبب', value: reason, inline: false },
                { name: '⏱️ المدة', value: `${duration} يوم/أيام`, inline: true },
                { name: '📅 من', value: startDate, inline: true },
                { name: '📅 إلى', value: endDate, inline: true },
                { name: '🕐 تاريخ التقديم', value: new Date().toLocaleString('ar-SA'), inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'نظام طلبات الإجازات' });

        // إنشاء أزرار القبول والرفض
        const acceptButton = new ButtonBuilder()
            .setCustomId(`accept_leave_${interaction.user.id}_${Date.now()}`)
            .setLabel('✔ قبول')
            .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
            .setCustomId(`reject_leave_${interaction.user.id}_${Date.now()}`)
            .setLabel('❌ رفض')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

        // إرسال الرسالة إلى روم الإدارة
        const managementMessage = await managementChannel.send({
            content: `<@&${config.roles.management}> طلب جديد يحتاج إلى مراجعة!`,
            embeds: [managementEmbed],
            components: [row]
        });

        // حفظ الطلب في قاعدة البيانات
        const request = database.addRequest({
            userId: interaction.user.id,
            username: interaction.user.tag,
            reason: reason,
            duration: parseInt(duration),
            startDate: startDate,
            endDate: endDate,
            managementMessageId: managementMessage.id
        });

        // إرسال تأكيد للمستخدم
        await interaction.editReply({
            content: '✅ تم تقديم طلب الإجازة بنجاح!\n' +
                     '⏳ سيتم مراجعة طلبك من قبل الإدارة.\n' +
                     '📬 ستصلك رسالة خاصة بنتيجة الطلب.'
        });

        // إرسال إلى روم اللوغ
        try {
            const logChannel = await client.channels.fetch(config.channels.logs);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📝 طلب إجازة جديد')
                    .setColor('#0099ff')
                    .addFields(
                        { name: '👤 المستخدم', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '🆔 رقم الطلب', value: `#${request.id}`, inline: true },
                        { name: '⏱️ المدة', value: `${duration} يوم/أيام`, inline: true },
                        { name: '📅 من - إلى', value: `${startDate} → ${endDate}`, inline: false },
                        { name: '📝 السبب', value: reason.substring(0, 200), inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام طلبات الإجازات' });

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال اللوغ:', error);
        }

    } catch (error) {
        console.error('خطأ في معالجة طلب الإجازة:', error);
        await interaction.editReply({
            content: '❌ حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.'
        });
    }
}

/**
 * قبول طلب الإجازة
 */
async function acceptLeaveRequest(interaction, client) {
    await interaction.deferUpdate();

    try {
        // الحصول على الطلب من قاعدة البيانات
        const request = database.getRequestByManagementMessage(interaction.message.id);

        if (!request) {
            return interaction.followUp({
                content: '❌ لم يتم العثور على الطلب في قاعدة البيانات.',
                ephemeral: true
            });
        }

        if (request.status !== 'قيد المراجعة') {
            return interaction.followUp({
                content: `⚠️ هذا الطلب تمت معالجته بالفعل (${request.status})`,
                ephemeral: true
            });
        }

        // إنشاء الرتبة الجديدة
        const guild = interaction.guild;
        // استخدام نفس الرتبة للإجازات بنفس المدة لتجنب تراكم الرتب
        // ملاحظة: يمكن للإدارة حذف الرتب القديمة يدوياً عند الحاجة
        const roleName = `إجازة - ${request.duration} ${request.duration === 1 ? 'يوم' : 'أيام'}`;
        
        let role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
            role = await guild.roles.create({
                name: roleName,
                color: '#00ff00',
                reason: `إنشاء رتبة إجازة لطلب #${request.id}`
            });
        }

        // إعطاء الرتبة للعضو
        const member = await guild.members.fetch(request.userId);
        await member.roles.add(role);

        // تحديث حالة الطلب
        database.updateRequestStatus(request.id, 'مقبول', roleName);

        // تحديث رسالة الإدارة
        const embed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(embed)
            .setColor('#00ff00')
            .setTitle('✅ طلب إجازة مقبول')
            .addFields(
                { name: '👮 تمت الموافقة بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🎖️ الرتبة الممنوحة', value: roleName, inline: true },
                { name: '🕐 تاريخ الموافقة', value: new Date().toLocaleString('ar-SA'), inline: false }
            );

        await interaction.message.edit({
            embeds: [updatedEmbed],
            components: [] // إزالة الأزرار
        });

        // إرسال رسالة للعضو في الخاص
        try {
            const user = await client.users.fetch(request.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 تم قبول طلب إجازتك!')
                .setColor('#00ff00')
                .setDescription('**تهانينا! تمت الموافقة على طلب إجازتك**')
                .addFields(
                    { name: '📝 السبب', value: request.reason, inline: false },
                    { name: '⏱️ المدة', value: `${request.duration} يوم/أيام`, inline: true },
                    { name: '📅 من', value: request.startDate, inline: true },
                    { name: '📅 إلى', value: request.endDate, inline: true },
                    { name: '🎖️ الرتبة', value: roleName, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'نتمنى لك إجازة سعيدة!' });

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.error('لم نتمكن من إرسال رسالة خاصة للعضو:', error);
        }

        // إرسال إلى روم اللوغ
        try {
            const logChannel = await client.channels.fetch(config.channels.logs);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('✅ تم قبول طلب إجازة')
                    .setColor('#00ff00')
                    .addFields(
                        { name: '🆔 رقم الطلب', value: `#${request.id}`, inline: true },
                        { name: '👤 العضو', value: `<@${request.userId}>`, inline: true },
                        { name: '👮 تمت الموافقة بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '🎖️ الرتبة الممنوحة', value: roleName, inline: false },
                        { name: '⏱️ المدة', value: `${request.duration} يوم/أيام`, inline: true },
                        { name: '📅 من - إلى', value: `${request.startDate} → ${request.endDate}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام طلبات الإجازات' });

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال اللوغ:', error);
        }

        await interaction.followUp({
            content: `✅ تم قبول الطلب وإعطاء الرتبة "${roleName}" للعضو <@${request.userId}>`,
            ephemeral: true
        });

    } catch (error) {
        console.error('خطأ في قبول الطلب:', error);
        await interaction.followUp({
            content: '❌ حدث خطأ أثناء قبول الطلب.',
            ephemeral: true
        });
    }
}

/**
 * رفض طلب الإجازة
 */
async function rejectLeaveRequest(interaction, client) {
    await interaction.deferUpdate();

    try {
        // الحصول على الطلب من قاعدة البيانات
        const request = database.getRequestByManagementMessage(interaction.message.id);

        if (!request) {
            return interaction.followUp({
                content: '❌ لم يتم العثور على الطلب في قاعدة البيانات.',
                ephemeral: true
            });
        }

        if (request.status !== 'قيد المراجعة') {
            return interaction.followUp({
                content: `⚠️ هذا الطلب تمت معالجته بالفعل (${request.status})`,
                ephemeral: true
            });
        }

        // إعطاء رتبة الرفض
        const guild = interaction.guild;
        const rejectRoleName = 'لم تُقبل إجازته';
        
        let rejectRole = guild.roles.cache.find(r => r.name === rejectRoleName);
        
        if (!rejectRole) {
            // إذا لم تكن الرتبة موجودة، استخدام الرتبة من config أو إنشاء واحدة جديدة
            if (config.roles.rejectedLeave) {
                rejectRole = guild.roles.cache.get(config.roles.rejectedLeave);
            }
            
            if (!rejectRole) {
                rejectRole = await guild.roles.create({
                    name: rejectRoleName,
                    color: '#ff0000',
                    reason: 'رتبة للطلبات المرفوضة'
                });
            }
        }

        // إعطاء الرتبة للعضو
        const member = await guild.members.fetch(request.userId);
        await member.roles.add(rejectRole);

        // تحديث حالة الطلب
        database.updateRequestStatus(request.id, 'مرفوض', rejectRoleName);

        // تحديث رسالة الإدارة
        const embed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(embed)
            .setColor('#ff0000')
            .setTitle('❌ طلب إجازة مرفوض')
            .addFields(
                { name: '👮 تم الرفض بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🕐 تاريخ الرفض', value: new Date().toLocaleString('ar-SA'), inline: false }
            );

        await interaction.message.edit({
            embeds: [updatedEmbed],
            components: [] // إزالة الأزرار
        });

        // إرسال رسالة للعضو في الخاص
        try {
            const user = await client.users.fetch(request.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('❌ تم رفض طلب إجازتك')
                .setColor('#ff0000')
                .setDescription('**نأسف، لم تتم الموافقة على طلب إجازتك**')
                .addFields(
                    { name: '📝 السبب المقدم', value: request.reason, inline: false },
                    { name: '⏱️ المدة المطلوبة', value: `${request.duration} يوم/أيام`, inline: true },
                    { name: '📅 من - إلى', value: `${request.startDate} → ${request.endDate}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'يمكنك التواصل مع الإدارة لمعرفة السبب' });

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.error('لم نتمكن من إرسال رسالة خاصة للعضو:', error);
        }

        // إرسال إلى روم اللوغ
        try {
            const logChannel = await client.channels.fetch(config.channels.logs);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('❌ تم رفض طلب إجازة')
                    .setColor('#ff0000')
                    .addFields(
                        { name: '🆔 رقم الطلب', value: `#${request.id}`, inline: true },
                        { name: '👤 العضو', value: `<@${request.userId}>`, inline: true },
                        { name: '👮 تم الرفض بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏱️ المدة المطلوبة', value: `${request.duration} يوم/أيام`, inline: true },
                        { name: '📅 من - إلى', value: `${request.startDate} → ${request.endDate}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام طلبات الإجازات' });

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال اللوغ:', error);
        }

        await interaction.followUp({
            content: `❌ تم رفض طلب <@${request.userId}> وإعطائه رتبة "${rejectRoleName}"`,
            ephemeral: true
        });

    } catch (error) {
        console.error('خطأ في رفض الطلب:', error);
        await interaction.followUp({
            content: '❌ حدث خطأ أثناء رفض الطلب.',
            ephemeral: true
        });
    }
}
