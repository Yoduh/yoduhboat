require('dotenv').config()
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');// Sets up the downloader
const youtubeMp3Converter = require('youtube-mp3-converter');
const { Client, Intents, MessageEmbed } = require('discord.js');
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

// Instantiate a new client with some necessary parameters.
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] }
);


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


// creates Download function
const convertLinkToMp3 = youtubeMp3Converter("./sounds");

try {
	client.login(process.env.DISCORD_TOKEN);
	console.log("logged in successfully");
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

const prefix = "!!";
const timeout = 10 * 60 * 1000 // min * sec * ms
let conn = null;
let timeoutID;
let queue = [];
let entrances = true;
const commandList = ['join', 'leave', 'add', 'remove', 'play', 'whatis', 'describe', 'stop', 'entrances', 'list', 'volume', 'trim'];

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
                message.reply("no name given or command not in proper format.");
                break;
            }
	        const name = args[0].toLowerCase();
            if (commandList.includes(name)) {
                message.reply("that word is reserved for a bot command, try a different name!");
                break;
            }
            if (fs.existsSync(`./sounds/${name}.mp3`)) {
                message.reply("a sound bite with that name already exists, try giving a different name");
                break;
            }
            let link = null;
            let start = null;
            let end = null;
            let duration = null;
            if (!args[1] || !args[1].includes("youtu")) {
                message.reply("I don't see a youtube link, did you use the proper command format?");
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
                writeMetadata(name, link, start, duration, message.member.user.username);
                message.reply(`sound successfully added, use '!!${name}' to play this sound bite`);
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
        case "volume":
            if (!args[0]) {
                message.reply("you did not specify a sound name");
                break;
            }
            if (!args[1]) {
                message.reply("you did not specify a volume amount");
                break;
            }
            await modifyVolume(args[0], args[1]);
            let volResult = replaceWithTemp(args[0]);
            if (volResult)
                message.reply(`volume of ${args[0]} multiplied by ${args[1]}`);
            else
                message.reply("oops, something went wrong. seek developer help");
            break;
        case "trim":
            // work in progress
            break;
            if (!args[0]) {
                message.reply("you did not specify a sound name");
                break;
            }
            if (!fs.existsSync(`./sounds/${args[0]}.mp3`)) {
                message.reply("can not find a sound by that name");
                break;
            }
            if (!args[1]) {
                message.reply("you did not specify a number of seconds to trim the start by");
                break;
            }
            if (!args[2]) {
                message.reply("you did not specify a number of seconds to trim the end by");
                break;
            }
            let editResult = await trim(args[0], args[1], args[2]);
            console.log("edit result", editResult);
            message.reply(editResult);
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
            } else {
                fs.unlinkSync(`./sounds/${fileToRemove}.mp3`)
                removeMetadata(fileToRemove);
                message.reply("sound removed");
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
            "!!volume <name> <number> - change the volume of a sound bite by multiplying its current volume value (always 1) by a given number (0.5 to halve, 2 to double, etc.)\n"+
            "!!play <name> - plays named sound bite\n"+
            "!!<name> - shorthand command to play named sound bite\n"+
            "!!whatis <name> - show sound bite details\n"+
            "!!describe <name> <text> - saves a description for a sound bite\n"+
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
            let whatisData = getMetadata(args[0]);
            if (!whatisData) {
                message.reply("cant find a sound by that name, check that it exists by typing !!list");
            } else {
                message.channel.send({ embeds: [createWhatIsEmbed(whatisData)]})
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
            let existing = await getMetadata(describeName);
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
            conn = getVoiceConnection(message.guildId);
            if (conn) {
                conn.disconnect();
            } else {
                console.log("no connection to leave from");
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
            if (!message.member.voice.channel) {
                message.reply("You must first join a voice channel");
                break;
            }
	        let soundCommand = command.toLowerCase();
            if (!fs.existsSync(`./sounds/${soundCommand}.mp3`)) {
                message.reply("sorry I can't find a sound by that name");
                break;
            }
            let soundResource = createAudioResource(`./sounds/${soundCommand}.mp3`, {
                inputType: StreamType.Arbitrary,
            });
            if (player.state.status === 'buffering' || player.state.status === 'playing') {
                queue.push(soundResource);
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
            console.log("playing sound ", soundCommand);
            player.play(soundResource);
            timeoutID = setTimeout(() => {
                if (conn) {
                    conn.disconnect();
                    conn.destroy();
                }
            }, timeout) // disconnect after not being used for 10min
			break;
	}
});

function timestampToSeconds(timestamp) {
    // timestamp given is already in seconds
    if (!timestamp.includes(":")) {
        return Number(timestamp);
    }
    let ms = 0;
    if (timestamp.includes(".")) {
        let split = timestamp.split(".");
        timestamp = split[0];
        ms = Number("0." + split[1]);
    }
    return Number(timestamp.split(':').reduce((acc,time) => (60 * acc) + +time) + ms);
}
function getTimeDifference(start, end) {
    const startInSec = timestampToSeconds(start);
    const endInSec = timestampToSeconds(end);
    let diff = endInSec - startInSec;
    diff = Math.round((diff + Number.EPSILON) * 100) / 100

    return Number(diff);
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
    const commandEmbed = new MessageEmbed()
	.setColor('#0099ff')
	.addFields(...fieldArray)
    .setFooter({ text: "Say !!whatis <sound> to get more information on a specific sound."})

    return commandEmbed;
}

function createWhatIsEmbed(data) {
    let start = data.start;
    if (!start.includes(":")) {
        if (Number(start) > 9) start = "00:0" + start;
        else start = "00:" + start;
    }
    let fieldArray = [
        { name: 'start:', value: start, inline: true },
        { name: 'duration:', value: data.duration + "s", inline: true },
        { name: 'added by:', value: data.user, inline: true },
        { name: 'created on:', value: data.created, inline: true }
    ]
    if (data.description == "") data.description = `no description available. try giving one with !!describe ${data.name} <text>`;
    const whatisEmbed = new MessageEmbed()
    .setTitle(data.name)
	.setAuthor({ name: 'Youtube Source', iconURL: 'https://emojipedia-us.s3.amazonaws.com/content/2020/04/05/yt.png', url: data.link+`&t=${timestampToSeconds(start)}` })
	.setURL(data.link+`&t=${timestampToSeconds(start)}`)
	.setDescription(data.description)
	.setColor('#37c743')
	.addFields(...fieldArray)

    return whatisEmbed;
}

function getMetadata(name) {
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    let soundData = data.find(s => s.name === name.toLowerCase())
    return soundData;
}

async function writeDescription(name, description) {
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    let soundData = data.find(s => s.name === name.toLowerCase())
    soundData.description = description;
    fs.writeFileSync("./descriptions.json", JSON.stringify(data, null, "\t"));
}

async function writeMetadata(name, link, start, duration, user) {
    let metadata = {
        name: name.toLowerCase(),
        description: "",
        link: link,
        start: start,
        duration: duration,
        user: user,
        created: new Date().toLocaleString() + " (ET)",
        tags: []
    };
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    // insert name in alphabetical order somewhere in list
    for (let i = 0; i < data.length; i++) {
        if (data[i].name.toLowerCase() > metadata.name) {
            console.log("splicing in ", name, " here!");
            data.splice(i, 0, metadata);
            break;
        } else if (i === data.length - 1) {
            console.log("pushing to end of array");
            data.push(metadata);
            break;
        }
    }
    fs.writeFileSync("./descriptions.json", JSON.stringify(data, null, "\t"));
}

async function removeMetadata(name) {
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    data = data.filter(s => s.name !== name.toLowerCase())
    fs.writeFileSync("./descriptions.json", JSON.stringify(data, null, "\t"));
}

async function modifyVolume(sound, volume) {
    console.log("modifying volume");
    return new Promise((resolve, reject) =>
        ffmpeg(`./sounds/${sound}.mp3`)
            .audioFilters([{ filter: 'volume', options: volume }])
            .on('error', (err) => reject(err))
            .on('end', () => resolve(`./sounds/${sound}.mp3`))
            .saveToFile(`./sounds/${sound}__TEMP.mp3`));
}

function replaceWithTemp(oldSound) {
    const newSound = oldSound+"__TEMP";
    if (!fs.existsSync(`./sounds/${newSound}.mp3`)) {
        return false;
    }
    fs.unlinkSync(`./sounds/${oldSound}.mp3`)
    fs.renameSync(`./sounds/${newSound}.mp3`, `./sounds/${oldSound}.mp3`);
    return true;
}

async function trim(name, s, e) {
    if (isNaN(s) || isNaN(e)) return "error: you must specify an amount to trim the start and end by in seconds (decimal allowed)";
    let start = Number(s);
    let end = Number(e);
    if (start < 0 || end < 0) return "trim amount can not be less than 0";
    let duration = 0;
    try {
        duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(`./sounds/${name}.mp3`, function(err, metadata) {
                if (err) {
                    return reject(err);
                }
                return resolve(metadata.format.duration);
            });
        });
    } catch(e) {
        return "unknown error occurred, seek developer help";
    }
    let trimAmount = Math.round((start + end + Number.EPSILON) * 100) / 100
    if (trimAmount >= duration) return "error: you're trying to trim longer than the duration of the sound bite";

    let newDuration = Math.round((duration - end - start + Number.EPSILON) * 100) / 100
    let ffmpegCommand = ffmpeg(`./sounds/${name}.mp3`)
        .output(`./sounds/${name}__TEMP.mp3`)
        .setStartTime(start)
        .setDuration(newDuration);

    return new Promise((resolve, reject) =>
      ffmpegCommand.on('end', resolve).on('error', reject).run()
    );
}