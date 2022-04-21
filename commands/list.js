const fs = require('fs');
const { MessageEmbed } = require('discord.js');

const command = async (message) => {
    let commandsEmbed = await createCommandsEmbed();
    message.channel.send({ embeds: [commandsEmbed]})
}

async function createCommandsEmbed() {
    const files = await fs.promises.readdir("./sounds/");
    const third = Math.ceil(files.length / 3);
    let fieldArray = Array(3);
    let i = -1;
    for(let j = 0; j < files.length; j++) {
        if (j !== 1 && j % third === 0) {
            i++;
            fieldArray[i] = { name: '\u200B', value: "", inline: true }
        }
        fieldArray[i].value += files[j].split(".opus")[0] + "\u000A"
    }
    fieldArray[0].name = "Sound Bite List"
    const commandEmbed = new MessageEmbed()
	.setColor('#0099ff')
	.addFields(...fieldArray)
    .setFooter({ text: "Say !!whatis <sound> to get more information on a specific sound."})

    return commandEmbed;
}

module.exports = command;