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
        "!!rename <name> <new name> - changes sound bite name\n"+
        "!!update <name> <start time> <end time (optional)> - set new start and end times for sound bite. end time becomes end of the video if not given\n"+
        "!!stop - stop the currently playing sound bite\n"+
        "!!entrance <name (optional)> - turn your entrance music on or off. provide an optional name to change what your entrance music should be.\n"+
        "!!list - list all sound bites"+
        "\`\`\`");
}

module.exports = command;