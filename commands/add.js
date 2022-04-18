const util = require('../helpers/util');
const metadata = require('../helpers/metadata');
const youtubeMp3Converter = require('youtube-mp3-converter');
const convertLinkToMp3 = youtubeMp3Converter("./sounds");
const fs = require('fs');

// reserved words for commands only
const commandList = ['join', 'leave', 'add', 'remove', 'play', 'whatis', 'describe', 'stop', 'entrances', 'list', 'volume', 'trim'];

const command = async (args, message) => {
    if (!args[0]) {
        message.reply("no name given or command not in proper format.");
        return;
    }
    const name = args[0].toLowerCase();
    if (commandList.includes(name)) {
        message.reply("that word is reserved for a bot command, try a different name!");
        return;
    }
    if (fs.existsSync(`./sounds/${name}.mp3`)) {
        message.reply("a sound bite with that name already exists, try giving a different name");
        return;
    }
    let link = null;
    let start = null;
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
    }
    if (start && end) {
        duration = util.getTimeDifference(start, end);
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
        metadata.write(name, link, start, duration, message.member.user.username);
        message.reply(`sound successfully added, use '!!${name}' to play this sound bite`);
    } else {
        message.reply(`I couldn't add this sound for some reason, seek developer help`);
    }
    return;
}

module.exports = command;