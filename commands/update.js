const fs = require('fs');
const util = require('../helpers/util');
const youtubeConverter = require('../helpers/converter');
const convertLink = youtubeConverter("./sounds");
const ytdl = require('ytdl-core');
const Sound = require("../db/Sound");

const command = async (args, message) => {
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
        newEnd = await ytdl.getInfo(sound.link).then(info => info.videoDetails.lengthSeconds);
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
            title: soundName // name for sound file
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