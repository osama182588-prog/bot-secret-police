async function handleSelect(interaction, client) {
    const customId = interaction.customId;

    // Handle reason template selection
    if (customId === 'reason_template') {
        const selected = interaction.values[0];
        // This can be extended for future use with reason templates
        await interaction.reply({
            content: `Selected: ${selected}`,
            ephemeral: true
        });
    }
}

module.exports = {
    handleSelect
};
