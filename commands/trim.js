const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    if (!fs.existsSync(`./sounds/${args[0]}.mp3`)) {
        message.reply("can not find a sound by that name");
        return;
    }
    if (!args[1]) {
        message.reply("you did not specify a number of seconds to trim the start by");
        return;
    }
    if (!args[2]) {
        message.reply("you did not specify a number of seconds to trim the end by");
        return;
    }
    let trimResult = await trim(args[0], args[1], args[2]);
    console.log("trim result", trimResult);
    message.reply(trimResult);
}

async function trim(name, s, e) {
    if (isNaN(s) || isNaN(e)) return "error: you must specify an amount to trim the start and end by in seconds (decimal allowed)";
    let start = Number(s);
    let end = Number(e);
    if (start < 0 || end < 0) return "trim amount can not be less than 0";
    let duration = 0;
    try {
        duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(`./sounds/${name}.mp3`, function(err, metadata) {
                if (err) {
                    return reject(err);
                }
                return resolve(metadata.format.duration);
            });
        });
    } catch(e) {
        return "unknown error occurred, seek developer help";
    }
    let trimAmount = Math.round((start + end + Number.EPSILON) * 100) / 100
    if (trimAmount >= duration) return "error: you're trying to trim longer than the duration of the sound bite";

    let newDuration = Math.round((duration - end - start + Number.EPSILON) * 100) / 100
    let ffmpegCommand = ffmpeg(`./sounds/${name}.mp3`)
        .output(`./sounds/${name}__TEMP.mp3`)
        .setStartTime(start)
        .setDuration(newDuration);

    return new Promise((resolve, reject) =>
      ffmpegCommand.on('end', resolve).on('error', reject).run()
    );
}

module.exports = command;