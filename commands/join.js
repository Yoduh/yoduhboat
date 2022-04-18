const { joinVoiceChannel } = require('@discordjs/voice');

const command = async (message) => {
    conn = await joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    });
    return conn;
}

module.exports = command;