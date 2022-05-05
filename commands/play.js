const fs = require('fs');
const { createAudioResource, getVoiceConnection, StreamType } = require('@discordjs/voice');
const { createReadStream } = require('node:fs');
const joinCommand = require("./join");
const Sound = require("../db/Sound");

const command = async (args, isWeb, isEntrance, message, masterPlayer) => {
    if (!isWeb && !isEntrance && !message.member.voice.channel) {
        message.reply("You must first join a voice channel");
        return;
    }
    if (!args[0]) {
        message.reply("you must specify the name of a sound for me to play");
        return;
    }
    const soundName = args[0].toLowerCase();
    const soundDb = await Sound.findOne({ name: soundName }).exec();
    if (!soundDb || !fs.existsSync(soundDb.file)) {
        if (!isWeb && !isEntrance) {
            message.reply("sorry I can't find a sound by that name");
        }
        return;
    }
    const guildPlayer = masterPlayer.getPlayer(message.guild.id);
    if (guildPlayer.player.state.status === 'buffering' || guildPlayer.player.state.status === 'playing') {
        let queueItem = {
            args: args,
            isWeb: isWeb,
            isEntrance: isEntrance,
            message: message
        }
        guildPlayer.queue.push(queueItem);
        return;
    }

    if (!guildPlayer.connection || guildPlayer.connection.joinConfig.channelId !== message.channelId) {
        await joinCommand(message, masterPlayer);
    }
    console.log(`playing sound ${isWeb ? 'from web' : ''}`, soundName);
    const resource = createAudioResource(createReadStream(soundDb.file), {
        inputType: StreamType.OggOpus,
    });
    guildPlayer.player.play(resource);
    if (!isEntrance) {
        soundDb.playCount += 1;
        soundDb.save();
    }
    return;
}

module.exports = command;