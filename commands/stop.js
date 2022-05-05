const command = async (message, masterPlayer) => {
    let guildPlayer = masterPlayer.getPlayer(message.guildId);
    guildPlayer.queue = [];
    guildPlayer.player.stop();
    message.reply("player stopped");
}

module.exports = command;