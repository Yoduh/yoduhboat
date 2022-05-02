const fs = require('fs');
const { MessageEmbed } = require('discord.js');
let total = 0;
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
let emojiResponse = [];

const listCommand = async (message) => {
    let commandsEmbed = await createCommandsEmbed(1);
    emojiResponse = total > 90 ? emojis.slice(0, Math.ceil(total / 90)) : [];
    message.channel.send({ embeds: [commandsEmbed]}).then(async embedMsg => {
        emojiResponse.forEach(async (er) => {
            await embedMsg.react(er);
        })
    })
}

const editEmbed = async (message, emoji) => {
    let pageNum = emojis.indexOf(emoji) + 1;
    if (pageNum === 0 || pageNum > emojiResponse.length) return;
    let edittedEmbed = await createCommandsEmbed(pageNum);
    message.edit({ embeds: [edittedEmbed]})
}

// message reactions control 'pages' of 90 sounds each to display
async function createCommandsEmbed(pageNum) {
    let start = (pageNum * 90) - 90;
    let end = (pageNum * 90);
    const files = await fs.promises.readdir("./sounds/");
    total = files.length;
    const third = Math.ceil((end - start) / 3);
    let fieldArray = [];
    let i = -1;
    for(let j = start; j < files.length && j < end; j++) {
        if (j !== start + 2 && j % third === 0) {
            i++;
            fieldArray[i] = { name: '\u200B', value: "", inline: true }
        }
        fieldArray[i].value += files[j].split(".opus")[0] + "\u000A"
    }
    fieldArray[0].name = `Sound Bite List ${total > 90 ? `(page ${pageNum})` : ''}`;
    const commandEmbed = new MessageEmbed()
	.setColor('#0099ff')
	.addFields(...fieldArray)
    .setFooter({ text: `Say !!whatis <sound> to get more information on a specific sound.${total > 90 ? '\nREACT to change pages' : ''}`})

    return commandEmbed;
}

module.exports = {
    listCommand,
    editEmbed
};