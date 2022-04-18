
const { getVoiceConnection } = require('@discordjs/voice');

const command = async (message) => {
    conn = getVoiceConnection(message.guildId);
    if (conn) {
        conn.disconnect();
    } else {
        console.log("no connection to leave from");
    }
}

module.exports = command;