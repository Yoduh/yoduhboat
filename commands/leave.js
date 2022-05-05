
const { getVoiceConnection } = require('@discordjs/voice');

const command = async (message, masterPlayer) => {
    let guildPlayer = masterPlayer.getPlayer(message.guildId);
    if (guildPlayer && guildPlayer.connection) {
        guildPlayer.connection.disconnect();
    } else {
        console.log("no connection to leave from");
    }
}

module.exports = command;