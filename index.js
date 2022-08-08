require('dotenv').config();
const { API } = require('./app');
const Player = require('./Player');
const Guild = require("./db/Guild");
const User = require("./db/User");
const emitter = require('./helpers/emitter');
const mongoose = require("mongoose");
const { updateWebClients, wssStart } = require ("./Websocket");
mongoose.connect("mongodb://localhost/music");

////////////////////// Logging Setup //////////////////////
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
    format.align(),
    format.errors({ stack: true}),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}\n${JSON.stringify(info.discordInfo)}\n${info.stack}`)
  ),
  defaultMeta: { service: 'bloop-bot' },
  transports: [
    // - Write to all logs with level `info` and below to `bloop-info.log`.
    new transports.File({ filename: 'bloop-info.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
        format.colorize(),
        format.simple()
        )
    }));
}
const fs = require('fs');
const { Client, Intents } = require('discord.js');
console.log
const commands = require('./commands');
// const { editEmbed } = require("./commands/list");

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    fetchAllMembers: true
});

const prefix = ".";
const yoduhId = '200809303907631104';
global.masterPlayer = null;

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
} catch(err) {
	console.log(err);
}
client.on("ready", async () => {
    masterPlayer = new Player(client);
    emitter.on('api/play', (body) => {
        client.emit("api/play", body);
    })
    console.log("bot is online");
    API(client, masterPlayer);
    wssStart();
    client.user.setActivity("music | .commands", {
        type: "PLAYING"
    });
});

client.on("error", (e, message) => {
    let simpleMessage = '';
    if (message) {
        simpleMessage = {
            content: message.content,
            user: message.member.displayName,
            guildId: message.guildId,
            channelId: message.channelId
        }
        message.reply(`I've encountered an error. <@${yoduhId}> check the logs!`);
    }
    logger.info({message: new Error(e), discordInfo: simpleMessage, stack: e.stack});
    console.error(e);
})

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.on('guildCreate', async (guild) => {
    await Guild.create({
        name: guild.name,
        guildId: guild.id
    })
});

client.on('guildDelete', async (guild) => {
    await Guild.deleteOne({
        guildId: guild.id
    })
});

client.on("messageCreate", async (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(/\s+/);
	const command = args.shift().toLowerCase();
    console.log("command = ", command);

    let dbGuild = await Guild.findOne({guildId: message.guildId}).exec();
    if (command !== "musicchannel" && dbGuild?.allowedChannels.length > 0 && !dbGuild.allowedChannels.includes(message.channel.id)) {
        let channels = dbGuild.allowedChannels.map(id => {
            let c = message.guild.channels.cache.get(id);
            return c.toString();
        });
		message.reply(`Wrong channel! Try the ${channels[0]} channel instead`).then(r => {
			setTimeout(() => {
		        message.delete();
                r.delete()
            }, 10000);
		}).catch(console.error);
		return;
	}
    
    const guildPlayer = masterPlayer.getPlayer(message.guild.id);
    guildPlayer.responseChannel = message.channel;
    const user = await User.findOneAndUpdate({userId: message.member.user.id}, {
        userId: message.member.user.id,
        username: message.member.user.username
    }, { upsert: true, new: true });
    let result = false;
    try {
        switch(command) {
            case "join":
                conn = await commands.join(message, guildPlayer);
                break;
            case "play":
                result = await commands.play(args, false, message, guildPlayer, false);
                break;
            case "playnext":
                result = await commands.play(args, false, message, guildPlayer, true);
                break;
            case "remove":
                await commands.remove(args, message, guildPlayer);
                break;
            case "stop":
                result = await commands.stop(message, guildPlayer);
                break;
            case "pause":
                result = await commands.pause(message, guildPlayer);
                break;
            case "unpause":
                await commands.pause(message, guildPlayer);
                break;
            case "skip":
                await commands.skip(message, guildPlayer);
                break;
            case "shuffle":
                await commands.shuffle(message, guildPlayer);
                break;
            case "current":
                await commands.current(message, guildPlayer);
                break;
            case "queue":
                await commands.queue(args, message, guildPlayer);
                break;
            case "commands":
                await commands.commands(message);
                break;
            case "leave":
                await commands.leave(guildPlayer);
                break;
            case "musicchannel":
                await commands.channel(args, message);
                break;
            case "playlist":
                await commands.playlist(args, message, user);
                break;
            case "seek":
                await commands.seek(guildPlayer);
                break;
            default:
                message.reply("I do not recognize that command")
                break;
        }
        if (result) {
            updateWebClients(command, message.guild.id, guildPlayer);
        }
    } catch(e) {
        client.emit('error', e, message)
    }
});
