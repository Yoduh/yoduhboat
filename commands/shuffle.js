const command = async (message, guildPlayer, isWeb = false) => {
    if (guildPlayer.queue.length === 0) {
        if (!isWeb) message.channel.send(`Empty queue can't be shuffled`);
        return false;
    }
    let restoreFirst = null;
    let queue = [ ...guildPlayer.queue ];
    // dont include paused/playing song
    if (guildPlayer.player.state.status === 'paused' || guildPlayer.player.state.status === 'playing') {
        restoreFirst = queue.shift();
    }
    for (var i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (restoreFirst) {
        queue.unshift(restoreFirst);
    }
    guildPlayer.queue.length = 0;
    guildPlayer.queue.push(...queue);
    if (!isWeb) message.channel.send(`Queue has been shuffled`)
    return true;
}

module.exports = command;