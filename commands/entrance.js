const fs = require('fs');
const mongoose = require("mongoose");
const User = require("../db/User");
mongoose.connect("mongodb://localhost/bloop");

const command = async (args, message) => {
    let userId = message.member.user.id;
    let user = await User.findOne({userId: userId});
    
    if ((!args[0] && !user) || (!args[0] && user && !user.entrance.sound) ) {
        message.reply(`you need to provide an entrance sound for me to add with \`!!entrance <sound>\``);
        return;
    } else if (!args[0] && user) { // no sound provided, will just toggle entrance on or off
        const toggleEntrance = user.entrance ? !user.entrance.enabled : true;
        user.entrance.enabled = toggleEntrance;
        user.updatedAt = Date.now();
        user.save();
        message.reply(`your entrance music has been toggled ${user.entrance.enabled ? "ON" : "OFF"}`);
        return;
    }
    let sound = args[0].toLowerCase();;
    // no sound found
    if (!fs.existsSync(`./sounds/${sound}.opus`)) {
        message.reply("sorry I can't find a sound by that name");
        return;
    }
    // setting sound as entrance
    // new user!
    if (!user) {
        user = new User({
            userId: userId,
            username: message.member.user.username,
            entrance: {
                enabled: true,
                sound: sound
            }
        })
    // existing user
    } else {
        user.entrance.enabled = true;
        user.updatedAt = Date.now();
        user.entrance.sound = sound;
    }
    user.save();
    message.reply(`sound ${sound} has been saved as your entrance music and has been turned ON`);
}

module.exports = command;