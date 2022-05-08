const Sound = require("../db/Sound");

const command = async (args, message) => {
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
    let existing = await Sound.findOne({name: describeName});
    if (!existing && message) {
        message.reply("error: could not find a sound with that name");
        return;
    } else if(!existing) {
        return [404, 'Can\'t find sound to update, please refresh the site and try again'];
    }
    if (existing.description !== "" && message) {
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
                    existing.description = describeText;
                    existing.save();
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
        existing.description = describeText;
        existing.save();
        if (message) {
            message.reply("description updated!");
        } else {
            return [200, 'Sound updated'];
        }
    }
    return;
}

module.exports = command;