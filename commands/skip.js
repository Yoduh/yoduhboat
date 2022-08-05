const command = async (message, guildPlayer) => {
    if (guildPlayer) {
        guildPlayer.player.stop();
    }
}

module.exports = command;