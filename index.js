require('dotenv').config();
const axios = require('axios');
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
	// console.log("message = ", message);
	// console.log("message.channel.id = ", message.channel.id);
	// console.log("message.content = ", message.content);
	if (!message.content.startsWith(prefix) || message.author.bot) return;
    
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
            // i have no idea why this doesn't work.  would be great if it did and bloop bot didn't have to deal with AudioPlayer and juggling connection subscriptions
            // case "test":
            //     conn = await joinVoiceChannel({
            //         channelId: message.member.voice.channel.id,
            //         guildId: message.guild.id,
            //         adapterCreator: message.guild.voiceAdapterCreator
            //     });
            //     conn.playOpusPacket(fs.readFileSync('./sounds/bruh.opus'));
            //     break;
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

////////////////////// API code /////////////////////////////
client.on("apiMessage", async (apiMessage) => {
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

const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require("./db/User");
const Sound = require("./db/Sound");
mongoose.connect("mongodb://localhost/bloop");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var corsOptions = {
    origin: ['http://localhost:3000', 'https://bloopbot.netlify.app'],
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(express.static(__dirname + '/sounds'));

app.post('/api/getToken', async (req, res) => {
    if (corsOptions.origin.includes(req.headers.referer))
    res.send("unauthorized origin");

    const params = new URLSearchParams();
      params.append('client_id', process.env.DISCORD_CLIENT_ID);
      params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', req.query.code);
      params.append('redirect_uri', `${req.headers.referer}auth/redirect`);
      // fetch the access token
      axios
        .post('https://discord.com/api/v8/oauth2/token', params, {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          }
        }).then(result => {
            res.send(result.data);
        })
});

app.post('/api/setToken', async (req, res) => {
    try {
        const tokenResponse = await axios.get('https://discordapp.com/api/users/@me', {
            headers: {
            Authorization: `Bearer ${req.body.access_token}`
            }
        });
        let user = null;
        if (tokenResponse.status === 200) {
            user = await User.findOneAndUpdate(
                {userId: tokenResponse.data.id}, // find existing user
                {                                // user information to update
                    ...req.body,
                    userId: tokenResponse.data.id,
                    username: tokenResponse.data.username,
                    updatedAt: Date.now()
                },
                {upsert: true, new: true}, // options (upsert: create on not found, new: return updated user after transaction)
            )
        }
        res.status(tokenResponse.status).send(user);
    } catch (e) {
        console.log("error in /api/setToken", e);
        res.sendStatus(401);
    }
});

/////////////// required authorization routes below ///////////////

app.use(async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(403).json({ error: 'No credentials sent!' });
    } 
    const isValidUser = await validateUser(req);
    if (!isValidUser) {
        return res.status(403).json({ error: 'Not a valid discord user!' });
    }
    next();
})

app.post('/api/play', (req, res) => {
    if (client.guilds.cache.get(req.body.guildId).channels.cache.get(req.body.channelId).members.size === 0) {
        res.status(405).json({ message: "Can't send sound bite to empty voice channel!" });
        return;
    }
    client.emit("apiMessage", req.body);
    res.sendStatus(200);
})

app.post('/api/servers', (req, res) => {
    let botGuilds = client.guilds.cache.map(g => g.id);
    let userGuilds = req.body.guilds;
    let matchingGuilds = userGuilds.filter(g => botGuilds.includes(g));
    res.send(matchingGuilds);
})
app.get('/api/sound', (req, res) => {
    let soundRequest = req.query.name;
    try {
        let soundBytes = fs.readFileSync(`./sounds/${soundRequest}.opus`);
        res.send(soundBytes);
        // const filePath = resolve(`./sounds/${soundRequest}.opus`);
        // res.sendFile(filePath)
    } catch(e) {
        console.log(e);
        res.sendStatus(404);
    }

})
app.get('/api/sounds', async (req, res) => {
    //let guild = req.query.server; // one day when sounds are tied to servers bot will need to get server id from query param
    let soundData = await Sound.find({});
    res.send(soundData);
})
app.post('/api/channels', async (req, res) => {
    let channels = client.guilds.cache.get(req.body.guildId).channels.cache
    let guild = await client.guilds.fetch(req.body.guildId);
    let user = await guild.members.fetch(req.body.userId);

    let result = [];
    channels.forEach(c => {
        if(c.type === "GUILD_VOICE" && user.permissionsIn(c).has("CONNECT")) {
            result.push({id: c.id, name: c.name})
        }
    })
    res.send(result);
})

app.post('/api/add', async (req, res) => {
    let addResponse = await commands.add(req.body.args, null, req.body.username);
    res.status(addResponse[0]).send(addResponse[1]);
})

app.post('/api/setFavorite', async (req, res) => {
    let soundId = req.body?.soundId;
    if (!soundId) {
        return res.status(401).send('Invalid request format, unable to set favorite');
    }
    let userId = JSON.parse(req.headers.authorization).id;
    let user = await User.findOne({ userId: userId});
    if (!user) {
        return res.status(401).send('Can\'t find user to update, try again later');
    }
    let favoriteIndex = user.favorites.indexOf(soundId);
    user.updatedAt = Date.now();
    if (favoriteIndex === -1) {
        user.favorites.push(soundId);
    } else {
        user.favorites.splice(favoriteIndex, 1);
    }
    user.save().then(() => {
        return res.status(200).send({favorites: user.favorites});
    }).catch(e => {
        return res.status(500).send('Error saving favorites, try again later');
    });
})

async function validateUser(req) {
    console.log("auth", req.headers.authorization);
    let auth = JSON.parse(req.headers.authorization);
    let user = await User.findOne({
        userId: auth.id, 
        access_token: auth.access_token
    });
    return !!user;
}

app.listen(PORT, () => {
    console.log(`Now listening to requests on port ${PORT}`);
});