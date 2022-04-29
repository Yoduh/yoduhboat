const { joinVoiceChannel } = require('@discordjs/voice');

const command = async (message) => {
    if (!message.member?.voice?.channel?.id) {
        message.reply("You must first join a voice channel!");
        return;
    }
    conn = await joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    });
    return conn;
}

module.exports = command;