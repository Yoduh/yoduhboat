require('dotenv').config()
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
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] }
);

const player = createAudioPlayer();
player.on(AudioPlayerStatus.Idle, () => {
    //play until queue is empty
    if (queue.length > 0) {
        player.play(queue.shift());
    }
    else if (subscription) {
        subscription.unsubscribe();
        subscription = null;
    }
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
            console.log("playing entrance music ", match);
            if (!match) return;
            conn = await joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            subscription = conn.subscribe(player);
            const resource = createAudioResource(`./sounds/${match}`, {
                inputType: StreamType.Arbitrary,
            });
            player.play(resource);
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
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
			break;
		case "add":
            commands.add(args, message);
            break;
        case "play":
            clearTimeout(timeoutID);
            let updatedConn = commands.play(args, message, player, queue);
            if (updatedConn) conn = updatedConn;
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
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
            let newConn = commands.play([command], message, player, queue);
            if (newConn) conn = newConn;
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
            break;
	}
});