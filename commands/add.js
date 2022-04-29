const util = require('../helpers/util');
const metadata = require('../helpers/metadata');
const youtubeConverter = require('../helpers/converter');
const convertLink = youtubeConverter("./sounds");
const ytdl = require('ytdl-core');
const Sound = require("../db/Sound");
const fs = require('fs');

// reserved words for commands only
const commandList = ['join', 'leave', 'add', 'remove', 'play', 'whatis', 'describe', 'stop', 'entrances', 'list', 'volume', 'trim'];

const command = async (args, message, webUser) => {
    if (!args[0] && !webUser) {
        message.reply("no name given or command not in proper format.");
        return;
    }
    const name = args[0].toLowerCase();
    if (commandList.includes(name)) {
        if (webUser) {
            return [400, "That word is reserved for a bot command, try a different name!"];
        }
        message.reply("that word is reserved for a bot command, try a different name!");
        return;
    }
    if (fs.existsSync(`./sounds/${name}.opus`)) {
        if (webUser) {
            return [400, "A sound bite with that name already exists, try giving a different name"];
        }
        message.reply("a sound bite with that name already exists, try giving a different name");
        return;
    }
    let link = null;
    let start = "00:00";
    let end = null;
    let duration = null;
    if (!args[1] || !args[1].includes("youtu")) {
        message.reply("I don't see a youtube link, did you use the proper command format?");
        return;
    } else {
        link = args[1];
    }
    if (args[2]) {
        start = args[2].toLowerCase();
    }
    if (args[3]) {
        end = args[3].toLowerCase();
    } else {
        end = await ytdl.getInfo(link).then(info => info.videoDetails.lengthSeconds);
    }
    duration = util.getTimeDifference(start, end);
    let pathToSound = null;
    // Downloads sound and returns path where it was saved.
    try {
        pathToSound = await convertLink(link, {
            startTime: start, // from where in the video the sound bite should start
            duration: duration, // Length of sound bite in seconds (from start point)
            title: name // name for sound file
        });
    } catch(e) {
        console.log("failed to convert:", e);
    }
    if (pathToSound) {
        metadata.write(name, link, start, duration, webUser ? webUser : message.member.user.username);
        if (webUser) {
            return [200, `Sound successfully added!`]
        }
        message.reply(`sound successfully added, use '!!${name}' to play this sound bite`);
    } else {
        if (webUser) {
            return [500, `I couldn't add this sound for some reason, seek developer help`];
        }
        message.reply(`I couldn't add this sound for some reason, seek developer help`);
    }
    return;
}

module.exports = command;