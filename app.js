const express = require('express');
const cors = require('cors');
const axios = require('axios');
const emitter = require('./helpers/emitter');
const mongoose = require("mongoose");
const User = require("./db/User");
mongoose.connect("mongodb://localhost/music");
const commands = require('./commands');
const debounce = require('debounce')
let client = null;

const API = function(_client, masterPlayer) {
client = _client;
const app = express();
const PORT = process.env.HTTP_PORT || 4001;
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
let debounceTimer;

var corsOptions = {
    origin: ['http://127.0.0.1:5173', 'https://yoduhboat.netlify.app', 'https://localhost:443'],
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

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

const playerForceStart = (guildPlayer) => {
    guildPlayer.forceStart();
}
let debounceStart = debounce(playerForceStart, 500);
app.post('/api/remove', async (req, res) => {
    const guildPlayer = masterPlayer.getPlayer(req.body.guild);
    try {
        let removeResponse = await commands.remove(req.body.songId, null, guildPlayer, true);
        return res.status(200).send(removeResponse);
    } catch(e) {
        return res.sendStatus(500)
    } finally {
        // debounce to allow enough time for player to stop and handle possibly more remove first song requests
        if (guildPlayer.songRemoving) {
            debounceStart(guildPlayer);
        }
    }
});

app.post('/api/pause', async (req, res) => {
    console.log('pause endpoint hit')
    const guildPlayer = masterPlayer.getPlayer(req.body.guild);
    try {
        await commands.pause(null, guildPlayer);
        return res.status(200).send(guildPlayer.player.state.status);
    } catch(e) {
        return res.sendStatus(500)
    }
})

app.listen(PORT, () => {
    console.log(`Now listening to requests on port ${PORT}`);
});
}

exports.API = API;