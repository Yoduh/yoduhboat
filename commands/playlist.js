const Guild = require("../db/Guild");
const User = require("../db/User");
const playlistCommands = require('./playlist/index.js');

const command = async (args, message, user, isWeb = false) => {
    let dbGuild = await Guild.findOne({guildId: message.guild.id}).populate('playlists').exec();
    if (user === null) {
        user = await User.findOne({userId: message.member.user.id})
    }
    const playlistCommand = args.shift();

    let result = false;
    try {
        switch(playlistCommand) {
            case "create":
                result = playlistCommands.create(args, message, dbGuild, user, isWeb);
                break;
            case "add":
                result = playlistCommands.add(args, message, dbGuild, isWeb);
                break;
            case "details":
                playlistCommands.details(args, message, dbGuild);
                break;
            case "remove":
                result = playlistCommands.remove(args, message, dbGuild, isWeb);
                break;
            case "delete":
                result = playlistCommands.delete(args, message, dbGuild, isWeb);
                break;
            case "list":
                playlistCommands.list(args, message);
                break;
            default:
                message.reply("I do not recognize that playlist command")
                break;
        }
        if (result) {
            return result
        }
    } catch(e) {
        console.log(e)
    }
}

module.exports = command;