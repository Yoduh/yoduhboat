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
        ////// play sound using reaction? //////
        // .then(embedMessage => {
        //     embedMessage.react("▶️");
        //     console.log("embedMessage", embedMessage)
        //     embedMessage.awaitReactions({ time: 15_000 })
        //     .then(collected => {
        //         console.log("collected", collected)
        //         const reaction = collected.first();
        //         if (reaction.emoji.name === '▶️') { console.log("ok")}
        //         else {console.log("emoji", reaction.emoji)}
        //     })
        //     .catch(console.error);
        // })
    }
    return;
}

function createWhatIsEmbed(data) {
    let start = data.start;
    if (!start.includes(":")) {
        if (Number(start) < 10) start = "00:0" + start;
        else start = "00:" + start;
    }
    let fieldArray = [
        { name: 'start:', value: start, inline: true },
        { name: 'duration:', value: data.duration + "s", inline: true },
        { name: 'added by:', value: data.user, inline: true },
        { name: 'created on:', value: data.created, inline: true }
    ]
    if (data.description == "") data.description = `no description yet! try giving one with\n\`!!describe ${data.name} <text>\``;
    let link = data.link+`&t=${util.timestampToSeconds(start)}`;
    const whatisEmbed = new MessageEmbed()
	.setAuthor({ name: `\'${data.name}\' details`, iconURL: 'https://emojipedia-us.s3.amazonaws.com/content/2020/04/05/yt.png', url: data.link+`&t=${util.timestampToSeconds(start)}` })
	.setURL(link)
    .setImage(`https://img.youtube.com/vi/${data.link.slice(-11)}/mqdefault.jpg`)
	.setDescription(data.description+`\n[Youtube link](${link})`)
	.setColor('#37c743')
	.addFields(...fieldArray)

    return whatisEmbed;
}

module.exports = command;