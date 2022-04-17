// Setup our environment variables via dotenv
require('dotenv').config()
// Import relevant classes from discord.js
const { Client, Intents, MessageEmbed } = require('discord.js');
// Instantiate a new client with some necessary parameters.
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] }
);

const fs = require('fs');

const { OpusEncoder } = require('@discordjs/opus');
// Create the encoder.
// Specify 48kHz sampling rate and 2 channel size.
const encoder = new OpusEncoder(48000, 2);

const {
	joinVoiceChannel,
    getVoiceConnection,
	createAudioPlayer,
	createAudioResource,
	entersState,
	StreamType,
	AudioPlayerStatus,
	VoiceConnectionStatus,
} = require('@discordjs/voice');

const player = createAudioPlayer();
let subscription = null;
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

// Sets up the downloader
const youtubeMp3Converter = require('youtube-mp3-converter');
// creates Download function
const convertLinkToMp3 = youtubeMp3Converter("./sounds");

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
} catch(err) {
	console.log(err);
}

const prefix = "!!";
const timeout = 10 * 60 * 1000 // min * sec * ms
let conn = null;
let timeoutID;
let queue = [];
let entrances = false;

client.on("ready", () => {
  console.log("bot is online");
});
client.on("voiceStateUpdate", async (oldState, newState) => {
    // entrance music for users
    if (entrances) {
        if (newState.channelId && newState.channelId !== oldState.guild.me.voice.channelId) {
            conn = await joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            let joinedUser = newState.member.user.username.toLowerCase();
            subscription = conn.subscribe(player);
            const resource = createAudioResource(`./sounds/${joinedUser}.mp3`, {
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
	// console.log("message.channel.id = ",message.channel.id);
	// console.log("message.content = ",message.content);
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();
    console.log("command = ", command);
	switch(command) {
		case "join":
            clearTimeout(timeoutID);
            conn = await joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
			break;
		case "add":
            if (!args[0]) {
                message.reply("no name given or not in proper format. type !!help for proper format");
                break;
            }
	        const name = args[0];
            if (fs.existsSync(`./sounds/${name}.mp3`)) {
                message.reply("a sound bite with that name already exists, try giving a different name");
                break;
            }
            let link = null;
            let start = null;
            let end = null;
            let duration = null;
            if (!args[1] || !args[1].includes("youtu")) {
                message.reply("I don't see a youtube link, type !!help for proper command format");
                break;
            } else {
                link = args[1];
            }
            if (args[2]) {
                start = args[2].toLowerCase();
            }
            if (args[3]) {
                end = args[3].toLowerCase();
            }
            if (start && end) {
                duration = getTimeDifference(start, end);
            }
            let pathToMp3 = null;
            // Downloads mp3 and Returns path were it was saved.
            try {
                pathToMp3 = await convertLinkToMp3(link, {
                    startTime: start, // from where in the video the mp3 should start
                    duration: duration, // Length of mp3 in seconds (from start point)
                    title: name // name for mp3 file
                });
            } catch(e) {
                console.log("failed to convert:", e);
            }
            if (pathToMp3) {
                writeName(name);
                message.reply(`sound successfully added, use '!!play ${name}' to play this sound bite`);
            } else {
                message.reply(`I couldn't add this sound for some reason, sorry :(`);
            }
            break;
        case "play":
            if (!message.member.voice.channel) {
                message.reply("You must first join a voice channel");
                break;
            }
            if (!args[0]) {
                message.reply("you must specify the name of a sound for me to play");
                break;
            }
	        let sound = args[0].toLowerCase();
            if (!fs.existsSync(`./sounds/${sound}.mp3`)) {
                message.reply("sorry I can't find a sound by that name");
                break;
            }
            if (player.state.status === 'buffering' || player.state.status === 'playing') {
                //message.reply("sorry I can't play another sound right now because another one should already be playing and Yoduh hasn't made a queue for me yet to handle such situations herpderp try again later");
                let s = createAudioResource(`./sounds/${sound}.mp3`, {
                    inputType: StreamType.Arbitrary,
                });
                queue.push(s);
                break;
            }

            clearTimeout(timeoutID);
            // make sure to send to send audio to proper voice channel
            conn = getVoiceConnection(message.guildId);
            if (!conn || message.member.voice.channelId !== message.guild.me.voice.channelId) {
                conn = await joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });
            }

            subscription = conn.subscribe(player);
            console.log("playing sound ", sound);
            const resource = createAudioResource(`./sounds/${sound}.mp3`, {
                inputType: StreamType.Arbitrary,
            });
            player.play(resource);
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
            break;
        case "help":
            message.reply("\`\n!!add <name> <youtube link> <start timestamp> <end timestamp>\n"+
            "example: !!add dead https://www.youtube.com/watch?v=XXXXXXXX 4:22 4:27\n"+
            "if no end time is given the sound bite will record to end of the video\n"+
            "if also no start time given the sound bite will begin at 00:00\n"+
            "name MUST be single word\`");
            break;
        case "list":
            let commandsEmbed = await createCommandsEmbed();
            message.channel.send({ embeds: [commandsEmbed]})
            break;
        case "remove":
            if (!args[0]) {
                message.reply("you did not specify a sound name");
                break;
            }
	        let fileToRemove = args[0];
            if (!fs.existsSync(`./sounds/${fileToRemove}.mp3`)) {
                message.reply("could not find the file, does it appear when you try the !!list command?");
                break;
            } else {
                fs.unlinkSync(`./sounds/${fileToRemove}.mp3`)
                removeDescription(fileToRemove);
                message.reply("sound removed");
                break;
            }
            break;
        case "stop":
            player.stop();
            message.reply("sound bite stopped");
            break;
		case "exit":
			process.exit(1);
			break;
        case "commands":
            message.reply(
            "\`\`\`"+
            "!!join - bot joins your voice channel\n"+
            "!!leave - bot leaves your voice channel\n"+
            "!!add <name> <youtube link> <start timestamp> <end timestamp> - adds new named sound bite. start and end timestamps optional\n"+
            "!!remove <name> - delete sound bite\n"+
            "!!play <name> - plays named sound bite\n"+
            "!!whatis <name> - gives a description (if available) for a sound bite\n"+
            "!!describe <name> <text> - saves a description for a sound bite\n"+
            "!!help - reminds you the format for 'add' command\n"+
            "!!stop - stop the currently playing sound bite\n"+
            "!!entrances - toggles whether bot should automatically play a sound bite named after a user whenever that user joins a voice channel\n"+
            "!!list - list all sound bites"+
            "\`\`\`")
            break;
        case "whatis":
            if (!args[0]) {
                message.reply("you did not specify a sound name");
                break;
            }
            let description = await findDescription(args[0]);
            if (description == null) {
                message.reply("cant find a sound by that name, check that it exists by typing !!list");
            } else if (description === "") {
                message.reply("no description exists, try adding one with !!describe <sound> <description text>");
            } else {
                message.reply(description)
            }
            break;
        case "describe":
            if (!args[0]) {
                message.reply("you did not specify a sound name");
                break;
            }
            if (!args[1]) {
                message.reply("you did not specify a description");
                break;
            }
            let describeName = args.shift();
            let describeText = args.join(" ");
            if (describeText.includes("=")) {
                message.reply("Sorry, my stupid bot brain can't accept a description that contains the = sign, can you try again without the = sign?");
                break;
            }
            let existing = await findDescription(describeName);
            if (existing !== "") {
                message.channel.send(`Do you want to overwrite this description? \`${existing}\` type \`YES\` or \`NO\``).then(() => {
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
                            writeDescription(describeName, describeText);
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
                break;
            } else {
                writeDescription(describeName, describeText);
                message.reply("description updated!");
            }
            break;
        case "leave":
            console.log("conn guild right now", conn?.joinConfig?.guildId);
            conn = getVoiceConnection(message.guildId);
            console.log("conn guild leaving from", conn?.joinConfig?.guildId);
            if (conn) {
                conn.disconnect();
            } else {
                console.log("no conn");
                console.log("client", client);
            }
            break;
        case "entrances":
            entrances = !entrances;
            if (entrances) {
                message.channel.send('Entrance music is turned ON');
            } else {
                message.channel.send('Entrance music is turned OFF');
            }
            break;
		default:
			message.reply("I have no idea what that means");
			break;
	}
});

function getTimeDifference(start, end) {
    let startMS = 0;
    if (start.includes(".")) {
        let startSplit = start.split(".");
        start = startSplit[0];
        startMS = Number("0." + startSplit[1]);
    }
    const startInSec = start.split(':').reduce((acc,time) => (60 * acc) + +time) + startMS;

    let endMS = 0;
    if (end.includes(".")) {
        let endSplit = end.split(".");
        end = endSplit[0];
        endMS = Number("0." + endSplit[1]);
    }
    const endInSec = end.split(':').reduce((acc,time) => (60 * acc) + +time) + endMS;
    let diff = endInSec - startInSec;
    diff = Math.round((diff + Number.EPSILON) * 100) / 100

    return diff;
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
        fieldArray[i].value += files[j].split(".mp3")[0] + "\u000A"
    }
    fieldArray[0].name = "Sound Bite List"
    const embed = new MessageEmbed()
	.setColor('#0099ff')
	.addFields(...fieldArray)
    .setFooter({ text: "Say !!whatis <sound> to get more information on a specific sound."})

    return embed;
}

async function findDescription(name) {
    let description = null;
    const data = fs.readFileSync("./descriptions.txt", "utf-8")
    let arr = data.split(/\r?\n/);
    for (let i = 0; i < arr.length; i++) {
        let split = arr[i].split("=");
        if (split[0] == name) {
            description = split[1];
            break;
        }
    }
    return description;
}

async function writeDescription(name, description) {
    let data = fs.readFileSync("./descriptions.txt", "utf-8")
    var rgx = new RegExp(`^(${name}=).*`,"m");
    data = data.replace(rgx, `${name}=${description}`);
    fs.writeFileSync("./descriptions.txt", data);
}

async function writeName(name) {
    let data = fs.readFileSync("./descriptions.txt", "utf-8")
    arr = data.split(/\r?\n/);
    let origLength = arr.length;
    // insert at start of list
    if (name < arr[0].split("=")[0]) {
        arr.splice(0, 0, name);
    // insert name in alphabetical order somewhere in list
    } else {
        for (let i = 0; i < arr.length - 1; i++) {
            let split = arr[i].split("=")[0];
            if (split < name && i !== arr.length - 1 && arr[i + 1].split("=")[0] > name) {
                arr.splice(i+1, 0, name+"=");
                break;
            }
        }
        // insert at end of list
        if (arr.length === origLength) {
            arr.splice(arr.length, 0, name+"=");
        }
    }
    data = arr.join("\n");
    fs.writeFileSync("./descriptions.txt", data);
}

async function removeDescription(name) {
    let data = fs.readFileSync("./descriptions.txt", "utf-8")
    arr = data.split(/\r?\n/);
    for (let i = 0; i < arr.length; i++) {
        let split = arr[i].split("=")[0];
        if (split === name) {
            arr.splice(i, 1);
            break;
        }
    }
    data = arr.join("\n");
    fs.writeFileSync("./descriptions.txt", data);
}