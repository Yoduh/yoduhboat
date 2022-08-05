const Guild = require("../db/Guild");
const User = require("../db/User");
const util = require('../helpers/util');

const command = async (args, message) => {
    let displayPage = 1;
    if (!isNaN(args[args.length - 1])) {
        displayPage = args.pop();
    }
    if (args.length > 0) {
        message.reply("Invalid command. Did you mean \`playlist <command>\` or \`playlists <pageNumber>\`?")
        return;
    }
    let dbGuild = await Guild.findOne({guildId: message.guildId}).populate('playlists').exec();
    let playlists = dbGuild.playlists;

    let response = `\nPage **${displayPage}** of **${Math.ceil(playlists.length / 40)}**\n`;

    for(let i = 0; i < 25 && i + (displayPage - 1) * 25 < playlists.length; i++) {
        let num = i + (displayPage - 1) * 25;
        let playlist = playlists[num];
        let user = await User.findById(playlist.createdBy);
        let duration = util.secondsToTimestamp(playlist.duration);
        response += `\n**${playlist.name}** - \`${playlist.songs.length}\` songs \`[${duration}]\` created by **${user.username}**`
    }
    message.channel.send(response);
    return;
}

module.exports = command;