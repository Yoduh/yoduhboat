const fs = require('fs');
const { createAudioResource, getVoiceConnection, StreamType } = require('@discordjs/voice');
const joinCommand = require("./join");

const command = async (args, message, player, queue) => {
    if (!message.member.voice.channel) {
        message.reply("You must first join a voice channel");
        return;
    }
    if (!args[0]) {
        message.reply("you must specify the name of a sound for me to play");
        return;
    }
    let sound = args[0].toLowerCase();
    if (!fs.existsSync(`./sounds/${sound}.mp3`)) {
        message.reply("sorry I can't find a sound by that name");
        return;
    }
    if (player.state.status === 'buffering' || player.state.status === 'playing') {
        let s = createAudioResource(`./sounds/${sound}.mp3`, {
            inputType: StreamType.Arbitrary,
        });
        queue.push(s);
        return;
    }

    // make sure to send to send audio to proper voice channel
    conn = getVoiceConnection(message.guildId);
    conn = await joinCommand(message);
    subscription = conn.subscribe(player);
    console.log("playing sound ", sound);
    const resource = createAudioResource(`./sounds/${sound}.mp3`, {
        inputType: StreamType.Arbitrary,
    });
    player.play(resource);
    return conn;
}

module.exports = command;