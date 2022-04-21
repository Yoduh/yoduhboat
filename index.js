require('dotenv').config();
const axios = require('axios');
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

// Instantiate a new client with some necessary parameters.
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS],
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

player.on(AudioPlayerStatus.Playing, () => {
    console.log("player now playing")
});

const prefix = "!!";
const timeout = 10 * 60 * 1000 // min * sec * ms
let conn = null;
let subscription = null;
let timeoutID;
let queue = [];
let entrances = true;

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
    // first time initialization stuff
    if(!fs.existsSync("./descriptions.json")) {
        fs.writeFile("./descriptions.json", JSON.stringify([], null, "\t"), err => {
            if (err) {
                console.error(err);
                return;
            }
        });
    }
    if (!fs.existsSync("./sounds")) {
        fs.mkdirSync("./sounds");
    }
} catch(err) {
	console.log(err);
}

client.on("ready", () => {
  console.log("bot is online");
});

client.on("voiceStateUpdate", async (oldState, newState) => {
    // entrance music for users
    if (entrances) {
        if (newState.channelId && newState.channelId !== oldState.channelId && !newState.member.user.bot) {
            let joinedUser = newState.member.user.username.toLowerCase();
            let match = fs.readdirSync('./sounds/').find(s => joinedUser.startsWith(s.split(".")[0]));
            if (!match) return;
            console.log("playing entrance music ", match);
            conn = await joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            subscription = conn.subscribe(player);
            const resource = createAudioResource(`./sounds/${match}`, {
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

client.on("messageCreate", async (message) => {
	// console.log("message = ", message);
	// console.log("message.channel.id = ", message.channel.id);
	// console.log("message.content = ", message.content);
	if (!message.content.startsWith(prefix)) return;

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();
    console.log("command = ", command);
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
            commands.add(args, message);
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
        case "entrances":
            entrances = commands.entrances(entrances, message);
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

app.post('/api/sound', (req, res) => {
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
app.get('/api/sounds', (req, res) => {
    //let guild = req.query.server; // one day when sounds are tied to servers bot will need to get server id from query param
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    res.send(data);
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

app.listen(PORT, () => {
    console.log(`Now listening to requests on port ${PORT}`);
});