const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * بوت نظام الإجازات للشرطة
 * Police Leave Request Bot
 */

// Constants for configuration validation
const CONFIG_PLACEHOLDERS = /^your_.+_here$/i;
const ERROR_BORDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * عرض خطأ منسق
 * Display formatted error message
 */
function displayError(title, messages, exitCode = 1) {
    console.error(`\n${ERROR_BORDER}`);
    console.error(title);
    console.error(`${ERROR_BORDER}\n`);
    messages.forEach(msg => console.error(msg));
    console.error(`${ERROR_BORDER}\n`);
    if (exitCode !== null) {
        process.exit(exitCode);
    }
}

/**
 * تحميل وتحقق من التكوين
 * Load and validate configuration
 */
function loadConfig() {
    const configFile = require('./config.json');
    
    // دمج التكوين من المتغيرات البيئية وملف config.json
    // Merge configuration from environment variables and config.json
    const config = {
        token: process.env.DISCORD_TOKEN || configFile.token,
        clientId: process.env.CLIENT_ID || configFile.clientId,
        guildId: process.env.GUILD_ID || configFile.guildId,
        channels: configFile.channels,
        roles: configFile.roles
    };

    // التحقق من صحة التكوين
    // Validate configuration
    const errors = [];

    if (!config.token || CONFIG_PLACEHOLDERS.test(config.token)) {
        errors.push('❌ التوكن غير صحيح أو لم يتم تعيينه');
        errors.push('   Token is invalid or not set');
        errors.push('   يرجى تعيين DISCORD_TOKEN في ملف .env أو token في config.json');
        errors.push('   Please set DISCORD_TOKEN in .env file or token in config.json');
    }

    if (!config.clientId || CONFIG_PLACEHOLDERS.test(config.clientId)) {
        errors.push('❌ معرف التطبيق غير صحيح أو لم يتم تعيينه');
        errors.push('   Client ID is invalid or not set');
        errors.push('   يرجى تعيين CLIENT_ID في ملف .env أو clientId في config.json');
        errors.push('   Please set CLIENT_ID in .env file or clientId in config.json');
    }

    if (!config.guildId || CONFIG_PLACEHOLDERS.test(config.guildId)) {
        errors.push('❌ معرف السيرفر غير صحيح أو لم يتم تعيينه');
        errors.push('   Guild ID is invalid or not set');
        errors.push('   يرجى تعيين GUILD_ID في ملف .env أو guildId في config.json');
        errors.push('   Please set GUILD_ID in .env file or guildId in config.json');
    }

    // التحقق من معرفات القنوات - Validate channel IDs
    if (config.channels) {
        if (!config.channels.leaveRequests || /^[A-Z_]+$/i.test(config.channels.leaveRequests)) {
            errors.push('❌ معرف قناة طلبات الإجازات غير صحيح أو لم يتم تعيينه');
            errors.push('   Leave requests channel ID is invalid or not set');
            errors.push('   يرجى تعيين channels.leaveRequests في config.json بمعرف صحيح');
            errors.push('   Please set channels.leaveRequests in config.json with a valid channel ID');
        }
        
        if (!config.channels.management || /^[A-Z_]+$/i.test(config.channels.management)) {
            errors.push('❌ معرف قناة الإدارة غير صحيح أو لم يتم تعيينه');
            errors.push('   Management channel ID is invalid or not set');
            errors.push('   يرجى تعيين channels.management في config.json بمعرف صحيح');
            errors.push('   Please set channels.management in config.json with a valid channel ID');
        }
        
        if (!config.channels.logs || /^[A-Z_]+$/i.test(config.channels.logs)) {
            errors.push('❌ معرف قناة السجلات غير صحيح أو لم يتم تعيينه');
            errors.push('   Logs channel ID is invalid or not set');
            errors.push('   يرجى تعيين channels.logs في config.json بمعرف صحيح');
            errors.push('   Please set channels.logs in config.json with a valid channel ID');
        }
    } else {
        errors.push('❌ معرفات القنوات غير موجودة في config.json');
        errors.push('   Channel IDs are missing from config.json');
    }

    // التحقق من معرفات الرتب - Validate role IDs
    if (config.roles) {
        if (!config.roles.management || /^[A-Z_]+$/i.test(config.roles.management)) {
            errors.push('❌ معرف رتبة الإدارة غير صحيح أو لم يتم تعيينه');
            errors.push('   Management role ID is invalid or not set');
            errors.push('   يرجى تعيين roles.management في config.json بمعرف صحيح');
            errors.push('   Please set roles.management in config.json with a valid role ID');
        }
        // rejectedLeave is optional, so we only validate if it's not empty
        if (config.roles.rejectedLeave && /^[A-Z_]+$/i.test(config.roles.rejectedLeave)) {
            errors.push('❌ معرف رتبة الإجازة المرفوضة غير صحيح');
            errors.push('   Rejected leave role ID is invalid');
            errors.push('   يرجى تعيين roles.rejectedLeave في config.json بمعرف صحيح أو تركه فارغاً');
            errors.push('   Please set roles.rejectedLeave in config.json with a valid role ID or leave it empty');
        }
    } else {
        errors.push('❌ معرفات الرتب غير موجودة في config.json');
        errors.push('   Role IDs are missing from config.json');
    }

    if (errors.length > 0) {
        errors.push('\n📖 للمزيد من المعلومات، راجع:');
        errors.push('   For more information, see:');
        errors.push('   - SETUP.md');
        errors.push('   - CONFIG_GUIDE.md');
        errors.push('   - TROUBLESHOOTING.md');
        displayError('❌ خطأ في التكوين - Configuration Error', errors);
    }

    return config;
}

const config = loadConfig();

// إنشاء عميل البوت مع الصلاحيات المطلوبة
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// تجميع الأوامر
client.commands = new Collection();

/**
 * تحميل جميع الأوامر من مجلد commands
 */
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
        console.log('⚠️ مجلد الأوامر غير موجود');
        return [];
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ تم تحميل الأمر: ${command.data.name}`);
        } else {
            console.log(`⚠️ الأمر في ${file} يفتقد "data" أو "execute"`);
        }
    }

    return commands;
}

/**
 * تسجيل الأوامر مع Discord API
 */
async function registerCommands() {
    const commands = loadCommands();
    
    if (commands.length === 0) {
        console.log('⚠️ لا توجد أوامر لتسجيلها');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log(`🔄 بدء تسجيل ${commands.length} أمر...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log(`✅ تم تسجيل ${data.length} أمر بنجاح`);
    } catch (error) {
        console.error('❌ خطأ في تسجيل الأوامر:', error);
    }
}

/**
 * تحميل جميع معالجات الأحداث من مجلد events
 */
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    if (!fs.existsSync(eventsPath)) {
        console.log('⚠️ مجلد الأحداث غير موجود');
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        
        console.log(`✅ تم تحميل الحدث: ${event.name}`);
    }
}

/**
 * عند جاهزية البوت
 */
client.once('ready', async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم ${client.user.tag}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // تسجيل الأوامر
    await registerCommands();
    
    // تحميل الأحداث
    loadEvents();
});

/**
 * معالجة أوامر Slash
 */
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ لم يتم العثور على الأمر: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`❌ خطأ في تنفيذ الأمر ${interaction.commandName}:`, error);
            
            const errorMessage = { content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
});

// معالجة الأخطاء
process.on('unhandledRejection', error => {
    console.error('❌ خطأ غير معالج:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ استثناء غير معالج:', error);
});

// تسجيل الدخول
client.login(config.token).catch(error => {
    const messages = [
        'الخطأ: ' + error.message,
        'Error: ' + error.message,
        '\n💡 الحلول المقترحة - Suggested Solutions:',
        '   1. تحقق من صحة التوكن في ملف config.json أو متغير DISCORD_TOKEN',
        '      Verify the token in config.json or DISCORD_TOKEN variable',
        '   2. تأكد من أن التوكن لم ينتهي أو يتم إعادة تعيينه',
        '      Make sure the token has not expired or been reset',
        '   3. احصل على توكن جديد من Discord Developer Portal',
        '      Get a new token from Discord Developer Portal',
        '      https://discord.com/developers/applications',
        '\n📖 للمزيد من المعلومات - For more information:',
        '   - TROUBLESHOOTING.md',
        '   - SETUP.md'
    ];
    displayError('❌ فشل تسجيل الدخول - Login Failed', messages);
});

module.exports = client;
