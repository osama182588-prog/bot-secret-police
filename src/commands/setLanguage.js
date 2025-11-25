const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { canManageLeaves } = require('../utils/permissions');
const { t } = require('../utils/lang');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-language')
        .setDescription('Change the bot language / تغيير لغة البوت')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select language / اختر اللغة')
                .setRequired(true)
                .addChoices(
                    { name: 'العربية', value: 'ar' },
                    { name: 'English', value: 'en' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!canManageLeaves(interaction.member)) {
            return interaction.reply({
                content: t('messages.noPermission'),
                ephemeral: true
            });
        }

        const language = interaction.options.getString('language');
        db.setLanguage(language);

        // Reload language module
        const lang = require('../utils/lang');
        lang.loadLanguages();

        await interaction.reply({
            content: t('messages.languageChanged', language, { language: language === 'ar' ? 'العربية' : 'English' }),
            ephemeral: true
        });
    }
};
