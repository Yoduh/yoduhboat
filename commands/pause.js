const command = async (message, guildPlayer) => {
    if (guildPlayer && guildPlayer.player.state.status === 'playing') {
        console.log("pause: pausing");
        if (guildPlayer.broadcaster) {
            guildPlayer.broadcaster = clearInterval(guildPlayer.broadcaster);
        }
        guildPlayer.player.pause();
        return true;
    } else if (guildPlayer && guildPlayer.player.state.status === 'paused'){
        console.log("pause: unpausing")
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