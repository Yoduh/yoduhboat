const util = require('../helpers/util');
const ffmpeg = require('fluent-ffmpeg');

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    if (!args[1]) {
        message.reply("you did not specify a volume amount");
        return;
    }
    await modifyVolume(args[0], args[1]);
    let volResult = util.replaceTempSound(args[0]);
    if (volResult)
        message.reply(`volume of ${args[0]} multiplied by ${args[1]}`);
    else
        message.reply("oops, something went wrong. seek developer help");
}

async function modifyVolume(sound, volume) {
    console.log("modifying volume");
    return new Promise((resolve, reject) =>
        ffmpeg(`./sounds/${sound}.mp3`)
            .audioFilters([{ filter: 'volume', options: volume }])
            .on('error', (err) => reject(err))
            .on('end', () => resolve(`./sounds/${sound}.mp3`))
            .saveToFile(`./sounds/${sound}__TEMP.mp3`));
}

module.exports = command;