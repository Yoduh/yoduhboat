const express = require('express');
const cors = require('cors');
const axios = require('axios');
const emitter = require('./helpers/emitter');
const mongoose = require("mongoose");
const User = require("./db/User");
const Sound = require("./db/Sound");
mongoose.connect("mongodb://localhost/bloop");
const commands = require('./commands');
let client = null;

const API = function(_client) {
client = _client;
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var corsOptions = {
    origin: ['http://localhost:3000', 'https://bloopbot.netlify.app'],
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(express.static(__dirname + '/sounds'));

app.post('/api/getToken', async (req, res) => {
    if (corsOptions.origin.includes(req.headers.referer))
    return res.send("unauthorized origin");

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

app.post('/api/play', (req, res) => {
    if (client.guilds.cache.get(req.body.guildId).channels.cache.get(req.body.channelId).members.size === 0) {
        return res.status(405).json({ message: "Can't send sound bite to empty voice channel!" });
    }
    emitter.emit("api/play", req.body);
    return res.sendStatus(200);
})

app.post('/api/servers', (req, res) => {
    let botGuilds = client.guilds.cache.map(g => g.id);
    let userGuilds = req.body.guilds;
    let matchingGuilds = userGuilds.filter(g => botGuilds.includes(g));
    return res.send(matchingGuilds);
})
app.get('/api/sound', (req, res) => {
    let soundRequest = req.query.name;
    try {
        let soundBytes = fs.readFileSync(`./sounds/${soundRequest}.opus`);
        return res.send(soundBytes);
        // const filePath = resolve(`./sounds/${soundRequest}.opus`);
        // res.sendFile(filePath)
    } catch(e) {
        console.log(e);
        return res.sendStatus(404);
    }

})
app.get('/api/sounds', async (req, res) => {
    //let guild = req.query.server; // one day when sounds are tied to servers bot will need to get server id from query param
    let soundData = await Sound.find({}).sort({name:1});
    return res.send(soundData);
})
app.post('/api/channels', async (req, res) => {
    let channels = client.guilds.cache.get(req.body.guildId).channels.cache
    let guild = await client.guilds.fetch(req.body.guildId);
    let user = await guild.members.fetch(req.body.userId);

    let result = [];
    channels.forEach(c => {
        if(c.type === "GUILD_VOICE" && user.permissionsIn(c).has("CONNECT")) {
            result.push({id: c.id, name: c.name})
        }
    })
    return res.send(result);
})

app.post('/api/add', async (req, res) => {
    let addResponse = await commands.add(req.body.args, null, req.body.username);
    return res.status(addResponse[0]).send(addResponse[1]);
})
app.post('/api/remove', async (req, res) => {
    let removeResponse = await commands.remove([req.query.name]);
    return res.status(removeResponse[0]).send(removeResponse[1]);
})
app.post('/api/update', async (req, res) => {
    // update for description and/or name -- right now only description
    let updateResponse = await commands.describe([req.body.details.name, req.body.details.description])
    return res.status(updateResponse[0]).send(updateResponse[1]);
})

app.post('/api/setFavorite', async (req, res) => {
    let soundId = req.body?.soundId;
    if (!soundId) {
        return res.status(401).send('Invalid request format, unable to set favorite');
    }
    let userId = JSON.parse(req.headers.authorization).id;
    let user = await User.findOne({ userId: userId});
    if (!user) {
        return res.status(401).send('Can\'t find user to update, try again later');
    }
    let favoriteIndex = user.favorites.indexOf(soundId);
    user.updatedAt = Date.now();
    if (favoriteIndex === -1) {
        user.favorites.push(soundId);
    } else {
        user.favorites.splice(favoriteIndex, 1);
    }
    user.save().then(() => {
        return res.status(200).send({favorites: user.favorites});
    }).catch(e => {
        return res.status(500).send('Error saving favorites, try again later');
    });
})

async function validateUser(req) {
    let auth = JSON.parse(req.headers.authorization);
    let user = await User.findOne({
        userId: auth.id, 
        access_token: auth.access_token
    });
    return !!user;
}

app.listen(PORT, () => {
    console.log(`Now listening to requests on port ${PORT}`);
});
}

module.exports = API;