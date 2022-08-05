const command = async (message, guildPlayer) => {
    guildPlayer.queue.length = 0;
    guildPlayer.player.stop();
    guildPlayer.isPlaying = false;
    message.channel.send("player stopped");
    return true;
}

module.exports = command;