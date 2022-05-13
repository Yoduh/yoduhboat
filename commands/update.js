const fs = require('fs');
const util = require('../helpers/util');
const youtubeConverter = require('../helpers/converter');
const convertLink = youtubeConverter("./sounds");
const ytdl = require('ytdl-core');
const Sound = require("../db/Sound");

const command = async (args, message, volume = 1) => {
    if (args.length < 2 || args.length > 3) {
        message.reply("incorrect number of arguments, use !!commands for help");
        return;
    }
    if (!args[0]) {
        message.reply("you did not specify a sound name");
        return;
    }
    let soundName = args[0];
    let sound = await Sound.findOne({ name: soundName })
    if (!sound) {
        message.reply("error: could not find a sound with that name")
    }
    if (!args[1]) {
        message.reply("you did not specify a new start time");
        return;
    }
    let newStart = util.timestampToSeconds(args[1]);
    let newStartTime = util.secondsToTimestamp(args[1]);
    
    let newEnd = null;
    let newEndTime = null;
    if (args[2]) {
        console.log("given end", args[2]);
        newEnd = util.timestampToSeconds(args[2]);
        newEndTime = util.secondsToTimestamp(args[2]);
    } else {
        const COOKIE = 'YSC=RnxgWI6I3-I; VISITOR_INFO1_LIVE=zQ6Xq5z4Mm4; __Secure-3PSID=JQhZWMa7E7fjJFlYuGLO44kOoZdLxA-FLSAdcZzWferpSTwa4DOmjvPh9AcDqcj53cKDBg.; __Secure-3PAPISID=r2UBd9QV57unuHr7/AIZPQic5cceWTPsCN; LOGIN_INFO=AFmmF2swRQIhANz4ah0FgiaNFScwfJOWVV5BWZGdGWzzQoeCQzlGilKBAiAuztNeXZKShIb8lDAJ-6M68udWjr_eNrCNhQfn3_KzOA:QUQ3MjNmeXlHN0NPeklFZ0VmVXlFMGNwSS1LZUxzVXFfMmV0ckYxR01WWDBUYXR6YUhqcDhMTHpsTW01cXBvYWdZdGlhdmhyWmxZTGg4ejg1QUpZbTVDelV4ZGhsdk1HdGQ4ZFlYYkdfX0R5dXhZMnR5TEg2TDZGek9oWktkNTdHcFhzUXBvdTE1bHZINWhsR1NwZm9uSkJNbVlKLWdScTlFWlZ5UFpJU0M5UV9wRzMxMk5WVmI2aGptVWdKZmh1Z21mcTUyYWhsQy02T0J6dU5BNktxXy12SXQ3MUhqVi1rQQ==; PREF=tz=America.New_York&f6=40000000&f5=30000; wide=1; __Secure-3PSIDCC=AJi4QfEWwr3VzFY5t0Lj2X2xMawJtYiv279uBEoJB8RejBazE0qxk4yV_MYySBELyHb4zC6HSQ';
        const options = {
            requestOptions: {
                headers: {
                cookie: COOKIE
                },
            },
        }
        newEnd = await ytdl.getInfo(sound.link, options).then(info => info.videoDetails.lengthSeconds);
        newEndTime = util.secondsToTimestamp(newEnd);
    }
    let duration = util.getTimeDifference(newStart, newEnd);

    // delete original sound file
    if (!fs.existsSync(`./sounds/${soundName}.opus`)) {
        if (message) {
            message.reply("could not find the file, does it appear when you try the !!list command?");
        } else {
            return [404, "There was an error trying to delete the sound, it may already no longer exist. Try refreshing the page"];
        }
    } else {
        console.log("deleting");
        fs.unlinkSync(`./sounds/${soundName}.opus`)
    }

    // create new sound file
    let pathToSound = null;
    try {
        pathToSound = await convertLink(sound.link, {
            startTime: newStart, // from where in the video the sound bite should start
            duration: duration, // Length of sound bite in seconds (from start point)
            title: soundName, // name for sound file
            volume: volume
        });
    } catch(e) {
        console.log("failed to convert:", e);
    }
    if (pathToSound) {
        console.log("converted", pathToSound);
        sound.start = newStart;
        sound.startTime = newStartTime;
        sound.end = newEnd;
        sound.endTime = newEndTime;
        sound.volume = volume;
        duration = duration;
        await sound.save();
        if (message) {
            message.reply(`sound updated!`);
        } else {
            return [200, `Sound updated`];
        }
    } else {
        console.log("could not convert")
        if (message) {
            message.reply(`I couldn't add this sound for some reason, seek developer help`);
        } else {
            return [500, `I couldn't add this sound for some reason, seek developer help`];
        }
    }

}

module.exports = command;