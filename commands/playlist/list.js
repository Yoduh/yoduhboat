const Guild = require("../../db/Guild");
const User = require("../../db/User");
const util = require('../../helpers/util');

const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
let total = 0;
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
let emojiResponse = [];

const listCommand = async (args, message) => {
    let displayPage = 1;
    if (!isNaN(args[args.length - 1])) {
        displayPage = args.pop();
    }
    if (args.length > 0) {
        message.reply("Invalid number of arguments. This command only accepts a single optional page number, e.g. \`playlist list 2\`")
        return;
    }
    let commandsEmbed = await createCommandsEmbed(1, message);
    emojiResponse = total > 25 ? emojis.slice(0, Math.ceil(total / 25)) : [];
    message.channel.send({ embeds: [commandsEmbed]}).then(async embedMsg => {
        emojiResponse.forEach(async (er) => {
            await embedMsg.react(er);
        })
    })
    return;
}

const editEmbed = async (message, emoji) => {
    let pageNum = emojis.indexOf(emoji) + 1;
    if (pageNum === 0 || pageNum > emojiResponse.length) return;
    let edittedEmbed = await createCommandsEmbed(pageNum, message);
    message.edit({ embeds: [edittedEmbed]})
}

// message reactions control 'pages' of 25 sounds each to display
async function createCommandsEmbed(pageNum, message) {
    let start = (pageNum * 25) - 25;
    let end = (pageNum * 25);
    let dbGuild = await Guild.findOne({guildId: message.guildId}).populate('playlists').exec();
    let playlists = dbGuild.playlists;
    total = playlists.length;
    let fieldArray = [];
    let i = -1;
    for(let j = start; j < playlists.length && j < end; j++) {
        i++;
        let playlist = playlists[j];
        let user = await User.findById(playlist.createdBy);
        let duration = util.secondsToTimestamp(playlist.duration);

        fieldArray[i] = { name: `**${playlist.name}**`, value: `\`${playlist.songs.length}\` songs \`[${duration}]\` created by **${user.global_name}**` }
    }
    const commandEmbed = new EmbedBuilder()
    .setTitle(`Playlists ${total > 25 ? `(page ${pageNum})` : ''}`)
	.setColor('#0099ff')
	.addFields(...fieldArray)
    if(total > 25) {
        commandEmbed.setFooter({ text: `REACT to change pages`})
    }

    return commandEmbed;
}

module.exports = {
    listCommand,
    editEmbed
};
