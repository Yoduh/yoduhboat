require('dotenv').config();
const app = require('./app');
const Player = require('./Player');
const emitter = require('./helpers/emitter');
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
////////////////////// Bloop Bot //////////////////////////
const fs = require('fs');
const { Client, Intents } = require('discord.js');
const commands = require('./commands');
const { editEmbed } = require("./commands/list");

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    fetchAllMembers: true
});

const prefix = "!!";
const yoduhId = '200809303907631104';
let masterPlayer = null;

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
    // first time initialization
    if (!fs.existsSync("./sounds")) {
        fs.mkdirSync("./sounds");
    }
} catch(err) {
	console.log(err);
}

client.on("ready", () => {
    masterPlayer = new Player(client);
    emitter.on('api/play', (body) => {
        client.emit("api/play", body);
    })
    console.log("bot is online");
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

client.on("messageCreate", async (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();
    console.log("command = ", command);
    try {
        switch(command) {
            case "join":
                conn = await commands.join(message, masterPlayer);
                break;
            case "add":
                commands.add(args, message, false);
                break;
            case "play":
                await commands.play(args, false, false, message, masterPlayer);
                break;
            case "volume":
                commands.volume(args, message);
                break;
            case "trim":
                // work in progress
                //commands.trim(args, message); or commands.edit(args, message)
                break;
            case "list":
                commands.list(message);
                break;
            case "remove":
                commands.remove(args, message);
                break;
            case "stop":
                commands.stop(message, masterPlayer);
                break;
            case "commands":
                commands.commands(message);
                break;
            case "whatis":
                commands.whatis(args, message);
                break;
            case "describe":
                commands.describe(args, message);
                break;
            case "leave":
                commands.leave(message, masterPlayer);
                break;
            case "entrance":
                commands.entrance(args, message);
                break;
            // case "flip":
            //     message.reply(Math.random() <= 0.5 ? "heads!" : "tails!");
            //     break;
            default:
                await commands.play([command], false, false, message, masterPlayer);
                break;
        }
    } catch(e) {
        client.emit('error', e, message)
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    if (user.bot || !reaction.message.author.bot || reaction.message.embeds.length !== 1) return;
    let embed = reaction.message.embeds[0];
    if (!embed.fields[0]?.name.startsWith("Sound Bite List")) {
        return;
    }

    let emoji = reaction.emoji.name;
    reaction.users.remove(reaction.users.cache.filter(u => u === user).first())
    editEmbed(reaction.message, emoji);
});

client.on("api/play", async (apiMessage) => {
    let message = {
        guildId: apiMessage.guildId,
        member: { voice: { channel: {id: apiMessage.channelId}}},
        guild: { 
            id: apiMessage.guildId,
            voiceAdapterCreator: client.guilds.cache.get(apiMessage.guildId).voiceAdapterCreator
         },
    }
    await commands.play([apiMessage.name], true, false, message, masterPlayer);
    let webChannel = client.guilds.cache.get(apiMessage.guildId).channels.cache.find(c => c.name === 'soundboard' && c.type === 'GUILD_TEXT');
    if (webChannel) {
        let webhooks = await webChannel.fetchWebhooks();
        if (webhooks) {
            webhooks.first().send({
                content: `!!${apiMessage.name}`,
                username: apiMessage.username,
                avatarURL: `https://cdn.discordapp.com/avatars/${apiMessage.userId}/${apiMessage.userAvatar}.jpg`
            })
        }
    }
});

app(client);