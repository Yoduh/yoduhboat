const util = require('../helpers/util');

const command = async (message, guildPlayer, isWeb = false) => {
    guildPlayer.queue.length = 0;
    guildPlayer.player.stop();
    guildPlayer.isPlaying = false;
    if (!isWeb) {
        message.channel.send("player stopped");
    }
    const historyDetails = {
        action: `cleared the queue`,
        userId: message.member.user.id,
        guildId: guildPlayer.guildId
    }
    util.createHistory(historyDetails)
    return true;
}

module.exports = command;