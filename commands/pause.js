const util = require('../helpers/util');

const command = async (message, guildPlayer) => {
    if (guildPlayer && guildPlayer.player.state.status === 'playing') {
        if (guildPlayer.broadcaster) {
            guildPlayer.broadcaster = clearInterval(guildPlayer.broadcaster);
        }
        guildPlayer.player.pause();
        const historyDetails = {
            action: `paused playback`,
            userId: message.member.user.id,
            guildId: guildPlayer.guildId
        }
        util.createHistory(historyDetails)
        return true;
    } else if (guildPlayer && guildPlayer.player.state.status === 'paused'){
        const historyDetails = {
            action: `unpaused playback`,
            userId: message.member.user.id,
            guildId: guildPlayer.guildId
        }
        util.createHistory(historyDetails)
        if (guildPlayer.pausedResource) {
            console.log('paused resource exists! playing it');
            guildPlayer.player.play(guildPlayer.pausedResource);
            guildPlayer.pausedResource = null;
            return true;
        }
        guildPlayer.player.unpause();
        return true;
    }
}

module.exports = command;