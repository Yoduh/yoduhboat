const command = async (message, guildPlayer, isWeb = false) => {
    guildPlayer.queue.length = 0;
    guildPlayer.player.stop();
    guildPlayer.isPlaying = false;
    if (!isWeb) {
        message.channel.send("player stopped");
    }
    return true;
}

module.exports = command;