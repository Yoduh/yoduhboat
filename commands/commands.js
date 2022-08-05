const command = (message) => {
    message.channel.send(
        "\u200b\n**GENERAL COMMANDS**\n"+
        "\`.join\` bot joins your voice channel\n"+
        "\`.leave\` bot leaves your voice channel\n"+
        "\`.play\` \`[YOUTUBE/SPOTIFY LINK] [PLAYLIST NAME] OR [TEXT]\` add song or playlist to queue or search for song first\n"+
        "\`.playnext\` \`[YOUTUBE/SPOTIFY LINK] [PLAYLIST NAME], OR [TEXT]\` add song or playlist to the front of the queue\n"+
        "\`.skip\` skip current playing song\n"+
        "\`.stop\` stop music and clear the queue\n"+
        "\`.pause\` toggles play state of music player. alias: unpause (they both will toggle)\n"+
        "\`.remove\` \`#\` Remove song at specified queue position\n"+
        "\`.remove\` \`#-#\` Remove range of songs from queue\n"+
        "\`.current\` describes current song being played\n"+
        "\`.shuffle\` randomizes the current order of songs in the queue (**warning:** not reversable)\n"+
        "\n**PLAYLIST COMMANDS**\n"+
        "\`.playlist create\` \`NAME\` creates new playlist\n"+
        "\`.playlist add\` \`NAME\` \`[YOUTUBE/SPOTIFY LINK]\` adds song(s) to playlist\n"+
        "\`.playlist details\` \`NAME\` shows playlist songs\n"+
        "\`.playlist remove\` \`NAME\` \`#\` remove song at specified playlist position\n"+
        "\`.playlist remove\` \`NAME\` \`#-#\` removes range of songs from playlist\n"+
        "\`.playlist delete\` \`NAME\` deletes playlist\n"+
        "\`.playlist list\` list all playlists saved on this server\n"
        );
}

module.exports = command;