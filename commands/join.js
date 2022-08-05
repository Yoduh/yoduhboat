const { joinVoiceChannel } = require('@discordjs/voice');

const command = async (message, guildPlayer) => {
    if (!message.member?.voice?.channel?.id) {
        message.reply("You must first join a voice channel!");
        return;
    }
    conn = await joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    });
    guildPlayer.connection = conn;
    guildPlayer.connection.subscribe(guildPlayer.player);
    return conn;
}

module.exports = command;