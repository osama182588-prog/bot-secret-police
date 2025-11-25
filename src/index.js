const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    Partials 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./database/db');

// Create client instance
// Note: GuildMembers is a privileged intent that must be enabled in the Discord Developer Portal
// (Bot > Privileged Gateway Intents > SERVER MEMBERS INTENT)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`✅ Loaded event: ${event.name}`);
}

// Reminder system - check for leaves ending soon
async function checkReminders() {
    const hoursBeforeEnd = config.reminderHoursBeforeEnd || 24;
    const leavesEndingSoon = db.getLeavesEndingSoon(hoursBeforeEnd);

    for (const leave of leavesEndingSoon) {
        // Check if we already sent a reminder (could add a reminded_at field to track this)
        try {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            const member = await guild.members.fetch(leave.user_id).catch(() => null);
            if (!member) continue;

            const embeds = require('./utils/embeds');
            const reminderEmbed = embeds.createReminderEmbed(leave);

            try {
                await member.send({ embeds: [reminderEmbed] });
                console.log(`📧 Sent reminder to ${leave.username} for leave ${leave.request_id}`);
            } catch (err) {
                console.log(`Could not send reminder DM to ${leave.username}:`, err.message);
            }

            // Log to leave log channel
            const logChannel = guild.channels.cache.get(config.channels.leaveLog);
            if (logChannel) {
                await logChannel.send({
                    content: `⏰ Reminder sent for leave **${leave.request_id}** - ending on ${leave.end_date}`,
                });
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }
}

// Run reminder check every hour
setInterval(checkReminders, 60 * 60 * 1000);

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Login to Discord
client.login(config.token)
    .then(() => {
        console.log('🚀 Bot is connecting...');
        // Run initial reminder check after bot is ready
        setTimeout(checkReminders, 5000);
    })
    .catch(error => {
        console.error('❌ Failed to login:', error);
    });
