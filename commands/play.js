const play = require('play-dl');
const util = require('../helpers/util');
const Guild = require("../db/Guild");
const Song = require('../db/Song');
const commands = require('../commands');
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

const command = async (args, isWeb, message, guildPlayer, isNext) => {
    if (!isWeb && !message.member.voice.channel) {
        message.reply("You must first join a voice channel");
        return false;
    }
    if (!args[0]) {
        message.reply("I do not see a music link that I can play, try with a youtube or spotify song/playlist link");
        return false;
    }
    let songLink = null;
    let description = null;
    if (!guildPlayer.connection) {
        await commands.join(message, guildPlayer);
    }
    if (args.length === 1 && (args[0].includes("youtu") || args[0].includes("spotify"))) {
        songLink = args[0];
    } else {
        description = args.join(" ");
    }

    // No link given
    if (description) {
        // first check for named playlist
        const dbGuild = await Guild.findOne({guildId: message.guildId}).populate('playlists').exec();
        const userPlaylist = dbGuild.playlists.find(p => p.namelower === description.toLowerCase());
        if (userPlaylist) {
            let queueItems = await Promise.all(userPlaylist.songs.map(async s => { 
                return {
                    song: await Song.findById(s),
                    isWeb: isWeb,
                    message: message
                };
            }));
            queueItems = queueItems.map(i => {
                i.song.addedBy = message.member.user.username;
                i.song.avatar = `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.png`; // for web
                return i;
            })
            guildPlayer.queue.push(...queueItems);
            message.channel.send(`Added \`${userPlaylist.songs.length}\` songs from playlist \`${userPlaylist.name}\` to queue \`[${util.secondsToTimestamp(userPlaylist.duration)}]\``)
            return true;
        }

        // no playlist found, do youtube search
        const results = await play.search(`${description}`, {
            limit: 5
        });
        if (!results || results.length === 0) {8
            message.channel.send("No results found, try different search terms")
            return false;
        } else {
            let response = await createSearchResponse(results);
            const filter = (reaction, user) => {
                return emojis.includes(reaction.emoji.name) && user.id === message.author.id;
            };
            message.channel.send(response).then(async embedMsg => {
                for (let i = 0; i < results.length; i++) {
                    await embedMsg.react(emojis[i]);
                }
                embedMsg.awaitReactions({filter, max: 1, time: 60000, errors: ['time']})
                .then(collected => {
                    const reaction = collected.first();
                    const num = emojis.findIndex(e => e === reaction.emoji.name);
                    songLink = results[num].url;
                    pushSongToQueue(songLink, message, false, guildPlayer, isNext);
                })
                .catch(() => {
                    console.log("No emoji chosen");
                    return false;
                });
            })
        }
        return true;
    }

    // process link
    if (songLink) {
        return pushSongToQueue(songLink, message, isWeb, guildPlayer, isNext)
    }
}

const pushSongToQueue = async (songLink, message, isWeb, guildPlayer, isNext) => {
    // add multiple songs if link is a playlist/album
    let songlist = [];
    let songData = null;
    if (songLink.includes("list=")) {
        songData = await play.playlist_info(songLink, { incomplete : true });
        songData.type = "playlist";
        songlist = songData.videos;
    } else if(songLink.includes("/playlist/") || songLink.includes("/album/")) {
        if (play.is_expired()) {
            await play.refreshToken()
        }
        songData = await play.spotify(songLink);
        songlist = songData.fetched_tracks.values().next().value;
    }
    if (songlist.length > 0) {
        const queueItems = await Promise.all(songlist.map(async s => { 
            return {
                song: await util.getSongDetails(s.url, message),
                isWeb: isWeb,
                message: message
            };
        }));
        if (isNext && guildPlayer.queue.length > 0) {
            guildPlayer.queue.splice(1, 0, ...queueItems);
        } else {
            guildPlayer.queue.push(...queueItems);
        }
        message.channel.send(`Found and added \`${queueItems.length}\` songs from ${songData.type} **${songData.artists?.length > 0 ? songData.artists[0].name + ' - ' : ''}${songData.title ? songData.title : songData.name}**`)
        return true;
    }

    // add single song
    let song = await util.getSongDetails(songLink, message);
    if (!song) {
        const err = "Error fetching song, try again later";
        if (isWeb) return err
        message.reply(err);
        return false;
    }
    let queueItem = {
        song: song,
        isWeb: isWeb,
        message: message
    }
    if (isNext && guildPlayer.queue.length > 0) {
        guildPlayer.queue.splice(1, 0, queueItem);
    } else {
        guildPlayer.queue.push(queueItem);
    }
    if (!isWeb) message.channel.send(`Added **${queueItem.song.artist ? queueItem.song.artist + ' - ': ''}${queueItem.song.title}** to queue`)
    return true;
}

const createSearchResponse = (results) => {
    let response = `\n**Select a track with a number emoji reaction:**`;

    for(let i = 0; i < results.length; i++) {
        // escape markdown characters
        results[i].title = results[i].title.replace(/[\*_~>]/gm, "\\$&")
        response += `\n**${i + 1}:** ${results[i].title} (${results[i].durationRaw})`
    }
    return response;
}

module.exports = command;