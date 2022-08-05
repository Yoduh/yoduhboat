const fs = require('fs');
const play = require('play-dl');
const Song = require("../db/Song");

const getTimeDifference = (start, end) => {
    const startInSec = timestampToSeconds(start);
    const endInSec = timestampToSeconds(end);
    let diff = endInSec - startInSec;
    diff = Math.round((diff + Number.EPSILON) * 100) / 100

    return Number(diff);
}
const timestampToSeconds = (timestamp) => {
    // timestamp given is already in seconds
    if (!String(timestamp).includes(":")) {
        return Number(timestamp);
    }
    let ms = 0;
    if (timestamp.includes(".")) {
        let split = timestamp.split(".");
        timestamp = split[0];
        ms = Number("0." + split[1]);
    }
    let res = parseInt(timestamp.split(':').reduce((acc,time) => (60 * acc) + +time) + ms);
    return res;
}
const secondsToTimestamp = (seconds) => {
    if (String(seconds).includes(":")) {
        return seconds;
    } else {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        let res = [
        h > 0 ? h : '',
        h > 0 && m <= 9 ? '0' + m : m || '0',
        s > 9 ? s : '0' + s
        ]
        .filter(Boolean)
        .join(':');
        return res;
    }
}

const getSongDetails = async (songLink, message) => {
    let song = null;
    // YOUTUBE
    if (songLink.includes("youtu")) {
        const songInfo = await play.video_info(songLink)
        song = new Song({
            title: songInfo.video_details.title,
            link: songInfo.video_details.url,
            source: "youtube",
            duration: songInfo.video_details.durationInSec,
            durationTime: songInfo.video_details.durationRaw,
            addedBy: message.member.user.username,
            // for web
            thumbnail: songInfo.video_details?.thumbnails[0].url,
            avatar: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.png`,
        });
        return song;
    } 
    // SPOTIFY
    else if (songLink.includes("spotify")) {
        if (play.is_expired()) {
            await play.refreshToken();
        }
        const songInfo = await play.spotify(songLink);
        song = new Song({
            title: songInfo.name,
            artist: songInfo.artists[0].name,
            link: songInfo.url,
            source: "spotify",
            duration: songInfo.durationInSec,
            durationTime: secondsToTimestamp(songInfo.durationInSec),
            addedBy: message.member.user.username,
            // for web
            thumbnail: songInfo.thumbnail.url,
            avatar: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.png`
        });
    }
    return song;
}

const pushSongToPlaylist = async (songLink, message, userPlaylist) => {
    // add multiple songs if link is a playlist
    let songlist = [];
    let playlist = null;
    if (songLink.includes("list=")) {
        playlist = await play.playlist_info(songLink, { incomplete : true });
        songlist = playlist.videos;
    } else if(songLink.includes("/playlist/")) {
        if (play.is_expired()) {
            await play.refreshToken()
        }
        playlist = await play.spotify(songLink);
        songlist = playlist.fetched_tracks.values().next().value;
    }
    if (songlist.length > 0) {
        const songlistDetails = await Promise.all(songlist.map(async s => { 
            let song = await getSongDetails(s.url, message);
            userPlaylist.duration += song.duration;
            return await song.save();
        }));
        userPlaylist.songs.push(...songlistDetails);
        await userPlaylist.save();
        return songlistDetails;
    }

    // add single song
    let song = await getSongDetails(songLink, message);
    if (!song) {
        message.reply("Error fetching song, try again later");
        return;
    }
    await song.save();
    userPlaylist.songs.push(song);
    userPlaylist.duration += song.duration;
    await userPlaylist.save();
    return song;
}


exports.getTimeDifference = getTimeDifference;
exports.timestampToSeconds = timestampToSeconds;
exports.secondsToTimestamp = secondsToTimestamp;
exports.getSongDetails = getSongDetails;
exports.pushSongToPlaylist = pushSongToPlaylist;