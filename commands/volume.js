const util = require('../helpers/util');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    let sound = args[0];
    if (!args[1]) {
        message.reply("you did not specify a volume amount");
        return;
    }
    let vol = args[1]
    if (!fs.existsSync(`./sounds/${sound}.opus`)) {
        if (!isWeb) {
            message.reply("sorry I can't find a sound by that name");
        }
        return;
    }
    await modifyVolume(sound, vol);
    let volResult = util.replaceTempSound(sound);
    if (volResult)
        message.reply(`volume of ${sound} multiplied by ${vol}`);
    else
        message.reply("oops, something went wrong. seek developer help");
}

async function modifyVolume(sound, volume) {
    console.log("modifying volume");
    return new Promise((resolve, reject) =>
        ffmpeg(`./sounds/${sound}.opus`)
            .audioFilters([{ filter: 'volume', options: volume }])
            .on('error', (err) => reject(err))
            .on('end', () => resolve(`./sounds/${sound}.opus`))
            .saveToFile(`./sounds/${sound}__TEMP.opus`));
}

module.exports = command;