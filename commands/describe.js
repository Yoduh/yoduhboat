const metadata = require('../helpers/metadata');

const command = async (args, message) => {
    console.log("we in here");
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    if (!args[1]) {
        message.reply("you did not specify a description");
        return;
    }
    let describeName = args.shift();
    let describeText = args.join(" ");
    let existing = await metadata.get(describeName);
    if (existing.description !== "") {
        message.channel.send(`Do you want to overwrite this description? \`${existing.description}\` type \`YES\` or \`NO\``).then(() => {
            const filter = m => m.author.id === message.author.id;
            message.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            })
            .then(message => {
                message = message.first();
                if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
                    metadata.updateDescription(describeName, describeText);
                    message.reply("description updated!");
                } else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
                    message.channel.send("roger that, description overwrite canceled");
                } else {
                    message.channel.send(`Not seeing a valid response. Description canceled!`)
                }
            })
            .catch(collected => {
                message.channel.send('Timed out. Description canceled!');
            });
        })
    } else {
        writeDescription(describeName, describeText);
        message.reply("description updated!");
    }
    return;
}

module.exports = command;