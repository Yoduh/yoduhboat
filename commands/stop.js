const command = async (queue, player, message) => {
    queue = [];
    player.stop();
    message.reply("player stopped");
}

module.exports = command;