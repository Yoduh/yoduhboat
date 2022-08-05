const { Permissions } = require('discord.js');
const Guild = require("../db/Guild");

const command = async (channelIDs, message) => {
    if(message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
        if (!message.guild.channels.cache.hasAll(...channelIDs)) {
            message.reply("Invalid channel. Did you paste 18 digit channel ID(s) that Yoduhboat has access to?");
            return;
        }
        await Guild.findOneAndUpdate({guildId: message.member.guild.id}, {
            name: message.member.guild.name,
            guildId: message.member.guild.id,
            allowedChannels: channelIDs,
            updatedAt: Date.now()
        }, { upsert: true, new: true });
        let channels = channelIDs.map(id => {
            let c = message.guild.channels.cache.get(id);
            return c.toString();
        });
        message.reply("Yoduhboat channel set. From now on I will only respond to commands from " + channels);
        return;
    } else {
        message.reply("Only server admins can use this command!");
        return;
    }
}

module.exports = command;

