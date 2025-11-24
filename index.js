const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

/**
 * بوت نظام الإجازات للشرطة
 * Police Leave Request Bot
 */

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
    console.error('❌ فشل تسجيل الدخول:', error);
    console.error('تأكد من أن التوكن صحيح في ملف config.json');
});

module.exports = client;
