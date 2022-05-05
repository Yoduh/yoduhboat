const { joinVoiceChannel } = require('@discordjs/voice');

const command = async (message, masterPlayer) => {
    if (!message.member?.voice?.channel?.id) {
        message.reply("You must first join a voice channel!");
        return;
    }
    conn = await joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    });
    let joinedPlayer = masterPlayer.getPlayer(message.guild.id);
    joinedPlayer.connection = conn;
    joinedPlayer.connection.subscribe(joinedPlayer.player);
    return conn;
}

module.exports = command;