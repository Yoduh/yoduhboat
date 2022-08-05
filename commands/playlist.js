const Guild = require("../db/Guild");
const playlistCommands = require('./playlist/index.js');

const command = async (args, message, user) => {
    let dbGuild = await Guild.findOne({guildId: message.guildId}).populate('playlists').exec();
    const playlistCommand = args.shift();

    try {
        switch(playlistCommand) {
            case "create":
                playlistCommands.create(args, message, dbGuild, user);
                break;
            case "add":
                playlistCommands.add(args, message, dbGuild);
                break;
            case "details":
                playlistCommands.details(args, message, dbGuild);
                break;
            case "remove":
                playlistCommands.remove(args, message, dbGuild);
                break;
            case "delete":
                playlistCommands.delete(args, message, dbGuild);
                break;
            case "list":
                playlistCommands.list(args, message);
                break;
            default:
                message.reply("I do not recognize that playlist command")
                break;
        }
    } catch(e) {
        console.log(e)
    }
}

module.exports = command;