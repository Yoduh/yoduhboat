const express = require('express');
const cors = require('cors');
const axios = require('axios');
const emitter = require('./helpers/emitter');
const mongoose = require("mongoose");
const play = require('play-dl');
const User = require("./db/User");
const Guild = require("./db/Guild");
const Playlist = require("./db/Playlist");
const Song = require("./db/Song");
mongoose.connect("mongodb://localhost/music");
const commands = require('./commands');
const debounce = require('debounce')
const { updateWebClients } = require ("./Websocket");
const util = require('./helpers/util');
let client = null;

const API = function(_client, masterPlayer) {
client = _client;
const app = express();
const PORT = process.env.HTTP_PORT || 4001;
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var corsOptions = {
    origin: ['http://localhost:5173', 'https://boat.yoduh.dev', 'https://localhost:443'],
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

app.post('/yoduhboat/api/wss', async (req, res) => {
    const arr = [...wss.clients].map(c => { return { id: c } });
    console.log(arr)
    return res.status(200).send({wss: arr});
})

// app.get('/yoduhboat/api/dev', async (req, res) => {
//     const song = await Song.findOne({title: 'Throne'});
//     console.log('song', song)
//     song.link = 'https://open.spotify.com/track/3zvjgw8Lt41RIyYbrlegJk'
//     song.save()
//     return res.status(200)
// })

app.post('/yoduhboat/api/getToken', async (req, res) => {
    const params = new URLSearchParams();
    params.append('client_id', process.env.DISCORD_CLIENT_ID);
    params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', req.query.code);
    params.append('redirect_uri', `${req.headers.referer}auth/redirect`);
    // fetch the access token
    axios
    .post('https://discord.com/api/v8/oauth2/token', params, {
        headers: {
        'content-type': 'application/x-www-form-urlencoded'
        }
    }).then(result => {
        return res.send(result.data);
    }).catch(e => {
        console.log('getToken error', e)
    })
});

app.post('/yoduhboat/api/setToken', async (req, res) => {
    try {
        const tokenResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
            Authorization: `Bearer ${req.body.access_token}`
            }
        });
        let user = null;
        if (tokenResponse.status === 200) {
            user = await User.findOneAndUpdate(
                {userId: tokenResponse.data.id}, // find existing user
                {                                // user information to update
                    ...req.body,
                    userId: tokenResponse.data.id,
                    username: tokenResponse.data.username,
                    global_name: tokenResponse.data.global_name,
                    avatar: tokenResponse.data.avatar,
                    updatedAt: Date.now()
                },
                {upsert: true, new: true}, // options (upsert: create on not found, new: return updated user after transaction)
            )
        }
        user = user.toObject()
        const guildResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: {
            Authorization: `Bearer ${req.body.access_token}`
            }
        });
        if (guildResponse.status === 200) {
            let formattedGuilds = guildResponse.data.map(g => {
                let link = null;
                if (g.icon) {
                  link = `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.jpg`;
                }
                return {
                  ...g,
                  image: link
                };
              });
            user.avatar = tokenResponse.data.avatar
            user.guilds = formattedGuilds
        }
        return res.status(tokenResponse.status).send(user);
    } catch (e) {
        console.log("error in /yoduhboat/api/setToken", e);
        return res.sendStatus(401);
    }
});

/////////////// required authorization routes below ///////////////

app.use(async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(403).json({ error: 'No credentials sent!' });
    } 
    const isValidUser = await validateUser(req);
    if (!isValidUser) {
        return res.status(403).json({ error: 'Not a valid discord user!' });
    }
    next();
})

async function validateUser(req) {
    let auth = JSON.parse(req.headers.authorization);
    let user = await User.findOne({
        userId: auth.id, 
        access_token: auth.access_token
    });
    return !!user;
}

app.post('/yoduhboat/api/servers', (req, res) => {
    let botGuilds = client.guilds.cache.map(g => g.id);
    let userGuilds = req.body.guilds;
    let matchingGuilds = userGuilds.filter(g => botGuilds.includes(g));
    return res.send(matchingGuilds);
})

const playerForceStart = (guildId, guildPlayer) => {
    updateWebClients('remove', guildId, guildPlayer)
    guildPlayer.forceStart();
}
let debounceStart = debounce(playerForceStart, 500);
app.post('/yoduhboat/api/remove', async (req, res) => { 
    const guildId = req.body.guild;
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.remove(req.body.songId, null, guildPlayer, true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('remove err', e)
        return res.status(500).send(e.toString());
    } finally {
        // debounce to allow enough time for player to stop and handle possibly more 'remove first song' requests
        console.log('queue length', guildPlayer.queue.length)
        if (guildPlayer.songRemoving) {
            debounceStart(guildId, guildPlayer);
        } else {
            updateWebClients('remove', guildId, guildPlayer)
        }
    }
});

app.post('/yoduhboat/api/pause', async (req, res) => {
    console.log('pause endpoint hit')
    const guildId = req.body.guild;
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        // if current song removed while paused, player will not have a resource and need to issue playTrack() instead of pause()
        if (guildPlayer.player.state.resource) {
            console.log('toggling pause');
            await commands.pause(null, guildPlayer);
        } else if (guildPlayer.queue.length > 0) {
            console.log('manually playing next track')
            const item = guildPlayer.queue[0];
            masterPlayer.playTrack(item, guildPlayer);
        }
        updateWebClients('pause', guildId, guildPlayer)
        return res.sendStatus(200);
    } catch(e) {
        console.log('pause err', e)
        return res.status(500).send(e.toString());
    }
})

app.post('/yoduhboat/api/seek', async (req, res) => {
    console.log('seek endpoint')
    const guildId = req.body.guild;
    const guildPlayer = masterPlayer.getPlayer(guildId);
    guildPlayer.broadcaster = clearInterval(guildPlayer.broadcaster);
    try {
        await commands.seek(req.body.seekTime, guildPlayer);
        res.sendStatus(200);
        console.log('done seeking, status?', guildPlayer.player.state.status)
        if (guildPlayer.player.state.status !== 'paused') {
            console.log('update em')
            updateWebClients('sync', guildId, guildPlayer)
        }
        return;
    } catch(e) {
        console.log('seek err', e)
        return res.status(500).send(e.toString());
    }
})

app.post('/yoduhboat/api/addSong', async (req, res) => {
    const guildId = req.body.guild;
    const userId = req.body.user;
    const songOrPlaylist = req.body.url;
    const message = await generateFakeMessage(userId, guildId)
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.play([songOrPlaylist], true, message, guildPlayer, false);
        updateWebClients('play', guildId, guildPlayer)
        return res.sendStatus(200);
    } catch(e) {
        console.log('addSong err', e)
        return res.status(500).send(e.toString());
    }
})

app.post('/yoduhboat/api/addSongNext', async (req, res) => {
    const guildId = req.body.guild;
    const userId = req.body.user;
    const songOrPlaylist = req.body.url;
    const message = await generateFakeMessage(userId, guildId)
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.play([songOrPlaylist], true, message, guildPlayer, true);
        updateWebClients('play', guildId, guildPlayer)
        return res.sendStatus(200);
    } catch(e) {
        console.log('addSongNext err', e)
        return res.status(500).send(e.toString());
    }
})

app.post('/yoduhboat/api/shuffle', async (req, res) => {
    console.log('shuffle endpoint')
    const guildId = req.body.guild;
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        let result = await commands.shuffle(null, guildPlayer, true);
        console.log('result', result);
        updateWebClients('shuffle', guildId, guildPlayer)
        return res.sendStatus(200);
    } catch(e) {
        console.log('shuffle err', e)
        return res.status(500).send(e.toString());
    }
})

app.post('/yoduhboat/api/search', async (req, res) => {
    const { text } = req.body
    let results = []
    // youtube playlist
    if (text.includes("list=")) {
        results = await play.playlist_info(text, { incomplete : true });
        console.log('results', results)
        results.type = 'playlist'
    }
    // spotify
    else if (text.includes("spotify.com")) {
        if (play.is_expired()) {
            await play.refreshToken()
        }
        let spotifyData = await play.spotify(text);
        // spotify album or playlist (return 1 search result per song)
        if(spotifyData.tracksCount) {
            console.log('spotifyData', spotifyData)
            const spotifyTracks = spotifyData.fetched_tracks.values().next().value;
            results = await Promise.all(spotifyTracks.map(async track => {
                // get info for closest matching youtube result
                return play.search(`${track.artists[0].name} ${track.name}`, {
                    limit: 1
                })
            }));
            results = { 
                type: 'playlist',
                id: spotifyData.id,
                title: spotifyData.name,
                channel: { name: 'Spotify' },
                videos: results.map(r => r[0]),
                videoCount: results.length,
                url: spotifyData.url,
                thumbnail: spotifyData.thumbnail
            }
        } 
        // single spotify song (return 10 search results)
        else {
            results = await play.search(`${spotifyData.artists[0].name} ${spotifyData.name}`, {
                limit: 10
            })
        }
    }
    // single youtube song search
    else {
        results = await play.search(`${text}`, { limit: 10 });
    }
    // format playlist results
    if (results.type === 'playlist') {
        let durationInSec = 0
        results.videos.forEach(v => {
            durationInSec += v.durationInSec;
        })
        const durationRaw = util.secondsToTimestamp(durationInSec)
        let thumbnail = results.thumbnail?.url ?? results.videos[0].thumbnails[0].url
        if (thumbnail.includes('?')) {
            thumbnail = thumbnail.split('?')[0]
        }
        const songs = results.videos.map(r => (
            ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }) => 
            ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }))(r))
        const formattedResults = { durationInSec, durationRaw, thumbnail: thumbnail, id: results.id, count: results.videoCount, title: results.title, channel: results.channel, url: results.url, songs}
        return res.status(200).send(formattedResults);
    }
    // format single song results
    else {
        const formattedResults = results.map(r => (
            ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }) => 
            ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }))(r))
        return res.status(200).send(formattedResults);
    }
})

app.get('/yoduhboat/api/playlists', async (req, res) => {
    try {
        const { guildId } = req.query
        let dbGuild = await Guild.findOne({guildId: guildId}).populate('playlists', ['createdBy', 'duration', 'name', 'songs', 'id']).exec();
        let playlists = dbGuild.playlists;
        total = playlists.length;
        let formattedResults = [];
        for(let i = 0; i < playlists.length; i++) {
            let playlist = playlists[i];
            let user = await User.findById(playlist.createdBy);
            let duration = util.secondsToTimestamp(playlist.duration);

            formattedResults.push({ id: playlist.id, name: playlist.name, songsNum: playlist.songs.length, duration: duration, createdBy: user.global_name})
        }
        res.status(200).send(formattedResults);
    } catch(e) {
        console.log('playlists err', e)
        return res.status(500).send(e.toString());
    }
})

app.get('/yoduhboat/api/playlist', async (req, res) => {
    const { playlistId } = req.query
    let playlist = await Playlist.findById(playlistId).populate('songs').populate('createdBy', 'global_name');
    if (!playlist) {
        return res.status(404).send('Playlist not found')
    }
    res.status(200).send(playlist);
})

app.post('/yoduhboat/api/playlist/removesong', async (req, res) => { 
    const { guildId, userId, playlistName, index } = req.body
    const message = await generateFakeMessage(userId, guildId)
    try {
        await commands.playlist(['remove', playlistName, index], message, null,  true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('playlist remove err', e)
        return res.status(500).send(e.toString());
    } finally {
        updateWebClients('playlist', guildId)
    }
});

app.post('/yoduhboat/api/playlist/remove', async (req, res) => { 
    const { guildId, userId, playlistName } = req.body
    const message = await generateFakeMessage(userId, guildId)
    try {
        await commands.playlist(['delete', playlistName], message, null,  true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('playlist delete err', e)
        return res.status(500).send(e.toString());
    } finally {
        updateWebClients('playlist', guildId)
    }
});

app.post('/yoduhboat/api/playlist/create', async (req, res) => { 
    const { guildId, userId, playlistName } = req.body
    const message = await generateFakeMessage(userId, guildId)
    try {
        await commands.playlist(['create', playlistName], message, null, true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('playlist create err', e)
        return res.status(500).send(e.toString());
    } finally {
        updateWebClients('playlist', guildId)
    }
});

app.post('/yoduhboat/api/playlist/addsong', async (req, res) => { 
    const { guildId, userId, playlistName, songUrl } = req.body
    const message = await generateFakeMessage(userId, guildId)
    try {
        await commands.playlist(['add', playlistName, songUrl], message, null,  true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('playlist add err', e)
        return res.status(500).send(e.toString());
    } finally {
        updateWebClients('playlist', guildId)
    }
});

app.post('/yoduhboat/api/stop', async (req, res) => { 
    const { guildId } = req.body
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.stop(null, guildPlayer,  true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('stop err', e)
        return res.status(500).send(e.toString());
    } finally {
        updateWebClients('stop', guildId)
    }
});



app.listen(PORT, () => {
    console.log(`Now listening to requests on port ${PORT}`);
});
}

async function generateFakeMessage(userId, guildId) {
    const guild = await masterPlayer.client.guilds.fetch(guildId); // Getting the guild.
    const member = await guild.members.fetch(userId); // Getting the member.
    const message = {
        member: {
            user: {
                id: member.user.id,
                avatar: member.user.avatar,
                global_name: member.user.globalName
            },
            voice: {
                channel: {
                    id: member.voice.channel.id
                }
            }
        },
        guild: {
            id: guild.id,
            voiceAdapterCreator: guild.voiceAdapterCreator
        }
    }
    console.log('message', message)
    return message;
}

exports.API = API;