const fs = require('fs');
const metadata = require('../helpers/metadata');

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    let fileToRemove = args[0];
    if (!fs.existsSync(`./sounds/${fileToRemove}.opus`)) {
        message.reply("could not find the file, does it appear when you try the !!list command?");
    } else {
        fs.unlinkSync(`./sounds/${fileToRemove}.opus`)
        metadata.remove(fileToRemove);
        message.reply("sound removed");
    }
}

module.exports = command;