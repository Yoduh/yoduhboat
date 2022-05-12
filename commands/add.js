const util = require('../helpers/util');
const youtubeConverter = require('../helpers/converter');
const convertLink = youtubeConverter("./sounds");
const ytdl = require('ytdl-core');
const Sound = require("../db/Sound");
const fs = require('fs');

// reserved words for commands only
const commandList = ['join', 'leave', 'add', 'remove', 'play', 'whatis', 'describe', 'stop', 'entrances', 'list', 'volume', 'update', 'rename', 'test'];

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
    let start = 0;
    let startTime = "0:00.00";
    let end = null;
    let endTime = null;
    let duration = null;
    if (!args[1] || !args[1].includes("youtu")) {
        message.reply("I don't see a youtube link, did you use the proper command format?");
        return;
    } else {
        link = args[1];
    }
    if (args[2]) {
        start = util.timestampToSeconds(args[2]);
        startTime = util.secondsToTimestamp(args[2]);
    }
    if (args[3]) {
        end = util.timestampToSeconds(args[3]);
        endTime = util.secondsToTimestamp(args[3]);
    } else {
        const COOKIE = 'YSC=RnxgWI6I3-I; VISITOR_INFO1_LIVE=zQ6Xq5z4Mm4; __Secure-3PSID=JQhZWMa7E7fjJFlYuGLO44kOoZdLxA-FLSAdcZzWferpSTwa4DOmjvPh9AcDqcj53cKDBg.; __Secure-3PAPISID=r2UBd9QV57unuHr7/AIZPQic5cceWTPsCN; LOGIN_INFO=AFmmF2swRQIhANz4ah0FgiaNFScwfJOWVV5BWZGdGWzzQoeCQzlGilKBAiAuztNeXZKShIb8lDAJ-6M68udWjr_eNrCNhQfn3_KzOA:QUQ3MjNmeXlHN0NPeklFZ0VmVXlFMGNwSS1LZUxzVXFfMmV0ckYxR01WWDBUYXR6YUhqcDhMTHpsTW01cXBvYWdZdGlhdmhyWmxZTGg4ejg1QUpZbTVDelV4ZGhsdk1HdGQ4ZFlYYkdfX0R5dXhZMnR5TEg2TDZGek9oWktkNTdHcFhzUXBvdTE1bHZINWhsR1NwZm9uSkJNbVlKLWdScTlFWlZ5UFpJU0M5UV9wRzMxMk5WVmI2aGptVWdKZmh1Z21mcTUyYWhsQy02T0J6dU5BNktxXy12SXQ3MUhqVi1rQQ==; PREF=tz=America.New_York&f6=40000000&f5=30000; wide=1; __Secure-3PSIDCC=AJi4QfEWwr3VzFY5t0Lj2X2xMawJtYiv279uBEoJB8RejBazE0qxk4yV_MYySBELyHb4zC6HSQ';
        const options = {
            requestOptions: {
                headers: {
                cookie: COOKIE
                },
            },
        }
        end = await ytdl.getInfo(link, options).then(info => info.videoDetails.lengthSeconds);
        endTime = util.secondsToTimestamp(end);
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
        // metadata.write(name, link, start, duration, webUser ? webUser : message.member.user.username);
        const newSound = new Sound({
            name: name,
            file: pathToSound,
            link: link,
            start: start,
            startTime: startTime,
            end: end,
            endTime: endTime,
            user: webUser ? webUser : message.member.displayName,
            duration: duration
        });
        newSound.save();
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