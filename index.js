require('dotenv').config();
const app = require('./app');
const User = require("./db/User");
const emitter = require('./helpers/emitter');
// setup logging
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
/*
known issues: 
1) play commands on different servers resets bot idle timer discord-wide.
2) queue is also discord-wide.  playing sounds on two servers will mean one server has to wait for the other's play result to finish before it's sound can play
to do:  create unique idle timers for different servers
        create player for each server actively using bloop bot.  connections can only be subscribed to their corresponding server's player
*/
const fs = require('fs');
const { Client, Intents } = require('discord.js');
const {
	joinVoiceChannel,
    getVoiceConnection,
	createAudioPlayer,
	createAudioResource,
	StreamType,
	AudioPlayerStatus,
} = require('@discordjs/voice');
const commands = require('./commands');
const { editEmbed } = require("./commands/list");

// Instantiate a new client with some necessary parameters.
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    fetchAllMembers: true
});

const player = createAudioPlayer();
player.on(AudioPlayerStatus.Idle, async () => {
    console.log("player now idle")
    subscription.unsubscribe();
    subscription = null;
    //play until queue is empty
    if (queue.length > 0) {
        let item = queue.shift();
        let queueResult = await commands.play(item.args, item.isWeb, item.message, player, queue, subscription);
        if (queueResult?.conn) conn = queueResult.conn;
        if (queueResult?.subscription) subscription = queueResult.subscription;
    }
});

const prefix = "!!";
const yoduhId = '200809303907631104';
const timeout = 10 * 60 * 1000 // min * sec * ms
let conn = null;
let subscription = null;
let timeoutID;
let queue = [];

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
    // first time initialization stuff
    if (!fs.existsSync("./sounds")) {
        fs.mkdirSync("./sounds");
    }
} catch(err) {
	console.log(err);
}

client.on("ready", () => {
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

client.on("voiceStateUpdate", async (oldState, newState) => {
    // entrance music for users
    if (newState.channelId && newState.channelId !== oldState.channelId && !newState.member.user.bot) {
        let joinedUser = newState.member.user.username.toLowerCase();
        console.log(`checking ${joinedUser} for entrance music`);
        let user = await User.findOne({userId: newState.member.user.id});
        let userSound = user?.entrance?.sound;
        if (userSound && user.entrance.enabled) {
            conn = await joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            subscription = conn.subscribe(player);
            console.log(`playing entrance music ${userSound}`);
            const resource = createAudioResource(`./sounds/${userSound}.opus`, {
                inputType: StreamType.Arbitrary,
            });
            clearTimeout(timeoutID);
            player.play(resource);
            timeoutID = setTimeout(() => { // idle disconnect
                if (conn?.disconnect && conn.state.status !== 'destroyed') {
                    console.log("idling too long after entrance, disconnecting");
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout)
            return;
        } else {
            console.log("entrance music not enabled for user, continuing...")
        }
    }

    if (oldState.channelId !== oldState.guild.me.voice.channelId || !oldState.channel){
        return(0); //If it's not the channel the bot's in
    }
    conn = getVoiceConnection(oldState.guild.id);
    if(oldState.channel.members.size === 1 && conn?.joinConfig?.channelId){
        console.log("no users remain in channel, leaving");  //Leave the channel
        conn.disconnect();
        conn.destroy();
        timeoutID = null;
    }
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.on("messageCreate", async (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
    // activate production maintenance mode lol (todo: make 'staging' bot)
    // if (message.member.displayName !== 'Yoduh') {
    //     message.reply("Yoduh says \"Bot is undergoing maintenance right now, SORRY\"");
    //     return;
    // }

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();
    console.log("command = ", command);
    try {
        switch(command) {
            case "join":
                clearTimeout(timeoutID);
                conn = await commands.join(message);
                timeoutID = setTimeout(() => { // idle disconnect
                    if (conn?.disconnect && conn.state.status !== 'destroyed') {
                        console.log("idling too long after joining, disconnecting")
                        conn.disconnect();
                        conn.destroy();
                    }
                }, timeout)
                break;
            case "add":
                commands.add(args, message, false);
                break;
            case "play":
                clearTimeout(timeoutID);
                let playResult = await commands.play(args, false, message, player, queue, subscription);
                if (playResult?.conn) conn = playResult.conn;
                if (playResult?.subscription) subscription = playResult.subscription;
                timeoutID = setTimeout(() => { // idle disconnect
                    if (conn?.disconnect && conn.state.status !== 'destroyed') {
                        console.log("idling too long after playing, disconnecting")
                        conn.disconnect();
                        conn.destroy();
                    }
                }, timeout)
                break;
            case "volume":
                commands.volume(args, message);
                break;
            case "trim":
                // work in progress
                //commands.trim(args, message);
                break;
            case "list":
                commands.list(message);
                break;
            case "remove":
                commands.remove(args, message);
                break;
            case "stop":
                commands.stop(queue, player, message);
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
                commands.leave(message);
                break;
            case "entrance":
                commands.entrance(args, message);
                break;
            default:
                clearTimeout(timeoutID);
                let defPlayResult = await commands.play([command], false, message, player, queue, subscription);
                if (defPlayResult?.conn) conn = defPlayResult.conn;
                if (defPlayResult?.subscription) subscription = defPlayResult.subscription;
                timeoutID = setTimeout(() => { // idle disconnect
                    if (conn?.disconnect && conn.state.status !== 'destroyed') {
                        console.log("idling too long after default play, disconnecting")
                        conn.disconnect();
                        conn.destroy();
                    }
                }, timeout)
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
    clearTimeout(timeoutID);
    let webPlayResult = await commands.play([apiMessage.name], true, message, player, queue, subscription);
    if (webPlayResult?.conn) conn = webPlayResult.conn;
    if (webPlayResult?.subscription) subscription = webPlayResult.subscription;
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
    timeoutID = setTimeout(() => { // idle disconnect
        if (conn?.disconnect && conn.state.status !== 'destroyed') {
            console.log("idling too long after web play, disconnecting")
            conn.disconnect();
            conn.destroy();
        }
    }, timeout)
});

app(client);