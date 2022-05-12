const fs = require('fs');
const Sound = require("../db/Sound");
const User = require("../db/User");

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    let fileToRemove = args[0];
    // delete from mongodb
    let removed = await Sound.findOneAndDelete({ name: fileToRemove })
    if (removed) {
        // remove sound id from all users favorites (to-do: also remove as entrance music and set entrance enabled to false)
        await User.updateMany({favorites: removed.id}, {
            $pull: {
                favorites: removed.id
            }
        });
    }
    if (!fs.existsSync(`./sounds/${fileToRemove}.opus`)) {
        if (message) {
            message.reply("could not find the file, does it appear when you try the !!list command?");
        } else {
            return [404, "There was an error trying to delete the sound, it may already no longer exist. Try refreshing the page"];
        }
    } else {
        fs.unlinkSync(`./sounds/${fileToRemove}.opus`)
        if (message) {
            message.reply("sound removed");
        } else {
            return [200, "Sound deleted"];
        }
    }
}

module.exports = command;