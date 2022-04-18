const command = (message) => {
    message.reply(
        "\`\`\`"+
        "!!join - bot joins your voice channel\n"+
        "!!leave - bot leaves your voice channel\n"+
        "!!add <name> <youtube link> <start timestamp> <end timestamp> - adds new named sound bite. start and end timestamps optional\n"+
        "!!remove <name> - delete sound bite\n"+
        "!!volume <name> <number> - change the volume of a sound bite by multiplying its current volume value (always 1) by a given number (0.5 to halve, 2 to double, etc.)\n"+
        "!!play <name> - plays named sound bite\n"+
        "!!<name> - shorthand command to play named sound bite\n"+
        "!!whatis <name> - show sound bite details\n"+
        "!!describe <name> <text> - saves a description for a sound bite\n"+
        "!!stop - stop the currently playing sound bite\n"+
        "!!entrances - toggles whether bot should automatically play a sound bite named after a user whenever that user joins a voice channel\n"+
        "!!list - list all sound bites"+
        "\`\`\`");
}

module.exports = command;