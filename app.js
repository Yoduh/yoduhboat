const express = require('express');
const cors = require('cors');
const axios = require('axios');
const emitter = require('./helpers/emitter');
const mongoose = require("mongoose");
const play = require('play-dl');
const User = require("./db/User");
mongoose.connect("mongodb://localhost/music");
const commands = require('./commands');
const debounce = require('debounce')
const { updateWebClients } = require ("./Websocket");
let client = null;

const API = function(_client, masterPlayer) {
client = _client;
const app = express();
const PORT = process.env.HTTP_PORT || 4001;
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var corsOptions = {
    origin: ['http://127.0.0.1:5173', 'https://yoduhboat.netlify.app', 'https://localhost:443'],
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

app.post('/api/wss', async (req, res) => {
    const arr = [...wss.clients].map(c => { return { id: c } });
    console.log(arr)
    return res.status(200).send({wss: arr});
})

app.post('/api/getToken', async (req, res) => {
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

app.post('/api/setToken', async (req, res) => {
    try {
        const tokenResponse = await axios.get('https://discordapp.com/api/users/@me', {
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
                    updatedAt: Date.now()
                },
                {upsert: true, new: true}, // options (upsert: create on not found, new: return updated user after transaction)
            )
        }
        return res.status(tokenResponse.status).send(user);
    } catch (e) {
        console.log("error in /api/setToken", e);
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

app.post('/api/servers', (req, res) => {
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
app.post('/api/remove', async (req, res) => { 
    const guildId = req.body.guild;
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.remove(req.body.songId, null, guildPlayer, true);
        return res.sendStatus(200);
    } catch(e) {
        console.log('remove err', e)
        return res.sendStatus(500)
    } finally {
        // debounce to allow enough time for player to stop and handle possibly more 'remove first song' requests
        if (guildPlayer.songRemoving) {
            debounceStart(guildId, guildPlayer);
        } else {
            updateWebClients('remove', guildId, guildPlayer)
        }
    }
});

app.post('/api/pause', async (req, res) => {
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
        return res.sendStatus(500)
    }
})

app.post('/api/seek', async (req, res) => {
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
        return res.sendStatus(500);
    }
})

app.post('/api/addSong', async (req, res) => {
    const guildId = req.body.guild;
    const userId = req.body.user;
    const url = req.body.url;
    const message = await generateFakeMessage(userId, guildId)
    const guildPlayer = masterPlayer.getPlayer(guildId);
    try {
        await commands.play([url], true, message, guildPlayer, false);
        updateWebClients('play', guildId, guildPlayer)
        return res.sendStatus(200);
    } catch(e) {
        console.log('addSong err', e)
        return res.sendStatus(500);
    }
})

app.post('/api/shuffle', async (req, res) => {
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
        return res.sendStatus(500);
    }
})

app.post('/api/search', async (req, res) => {
    const results = await play.search(`${req.body.text}`, {
        limit: 10
    });
    const formattedResults = results.map(r => (
        ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }) => 
        ({ durationInSec, durationRaw, id, thumbnails, title, url, channel }))(r))
    res.status(200).send(formattedResults);
})

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
                avatar: member.user.avatar
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
    return message;
}

exports.API = API;