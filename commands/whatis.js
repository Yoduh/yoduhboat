const metadata = require('../helpers/metadata');
const util = require('../helpers/util');
const { MessageEmbed } = require('discord.js');

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    let data = metadata.get(args[0]);
    if (!data) {
        message.reply("cant find a sound by that name, check that it exists by typing !!list");
    } else {
        message.channel.send({ embeds: [createWhatIsEmbed(data)]})
    }
    return;
}

function createWhatIsEmbed(data) {
    let start = data.start;
    if (!start.includes(":")) {
        if (Number(start) > 9) start = "00:0" + start;
        else start = "00:" + start;
    }
    let fieldArray = [
        { name: 'start:', value: start, inline: true },
        { name: 'duration:', value: data.duration + "s", inline: true },
        { name: 'added by:', value: data.user, inline: true },
        { name: 'created on:', value: data.created, inline: true }
    ]
    if (data.description == "") data.description = `no description available. try giving one with !!describe ${data.name} <text>`;
    const whatisEmbed = new MessageEmbed()
    .setTitle(data.name)
	.setAuthor({ name: 'Youtube Source', iconURL: 'https://emojipedia-us.s3.amazonaws.com/content/2020/04/05/yt.png', url: data.link+`&t=${util.timestampToSeconds(start)}` })
	.setURL(data.link+`&t=${util.timestampToSeconds(start)}`)
	.setDescription(data.description)
	.setColor('#37c743')
	.addFields(...fieldArray)

    return whatisEmbed;
}

module.exports = command;