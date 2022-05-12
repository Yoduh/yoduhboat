const Sound = require("../db/Sound");
const fs = require('fs');

const command = async (args, message) => {
    if (args.length > 2) {
        message.reply("unexpected number of arguments, only provide OLD name and NEW name with !!rename command");
        return;
    }
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    if (!args[1]) {
        message.reply("you did not specify a new name");
        return;
    }
    let oldName = args[0];
    let newName = args[1];
    let existing = await Sound.findOne({name: oldName});
    if (!existing && message) {
        message.reply("error: could not find a sound with that name");
        return;
    } else if(!existing) {
        return [404, 'Can\'t find sound to update, please refresh the site and try again'];
    }
    fs.rename(`./sounds/${oldName}.opus`, `./sounds/${newName}.opus`, () => {});
    existing.name = newName;
    existing.file = `./sounds/${newName}.opus`;
    existing.save();
    if (message) {
        message.reply("sound name updated!");
    } else {
        return [200, 'Sound updated'];
    }
    return;
}

module.exports = command;