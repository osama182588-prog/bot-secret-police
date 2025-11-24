const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Command ${interaction.commandName} not found.`);
                return;
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                const reply = {
                    content: '❌ An error occurred while executing this command.',
                    ephemeral: true
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // Handle button interactions
        if (interaction.isButton()) {
            const buttonHandler = require('../handlers/buttonHandler');
            try {
                await buttonHandler.handleButton(interaction, client);
            } catch (error) {
                console.error('Error handling button:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing this action.',
                        ephemeral: true
                    });
                }
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const modalHandler = require('../handlers/modalHandler');
            try {
                await modalHandler.handleModal(interaction, client);
            } catch (error) {
                console.error('Error handling modal:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing your submission.',
                        ephemeral: true
                    });
                }
            }
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            const selectHandler = require('../handlers/selectHandler');
            try {
                await selectHandler.handleSelect(interaction, client);
            } catch (error) {
                console.error('Error handling select menu:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing your selection.',
                        ephemeral: true
                    });
                }
            }
        }
    }
};
