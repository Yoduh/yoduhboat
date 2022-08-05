
const command = async (guildPlayer) => {
    if (guildPlayer && guildPlayer.connection) {
        guildPlayer.queue.length = 0;
        guildPlayer.player.stop(true);
        guildPlayer.isPlaying = false;
        guildPlayer.connection.disconnect();
        guildPlayer.connection = null;
    } else {
        console.log("no connection to leave from");
    }
}

module.exports = command;