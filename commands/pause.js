const command = async (message, guildPlayer) => {
    if (guildPlayer && guildPlayer.player.state.status === 'playing') {
        console.log("pause: pausing");
        guildPlayer.player.pause();
        return true;
    } else if (guildPlayer && guildPlayer.player.state.status === 'paused'){
        console.log("pause: unpausing")
        guildPlayer.player.unpause();
        return true;
    }
}

module.exports = command;