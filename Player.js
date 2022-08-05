const play = require('play-dl');
const { createAudioResource } = require('@discordjs/voice');
const { broadcastDoneSong } = require('./Websocket');

// do NOT clear queue by setting it to an empty array because it'll get rid of this...
const eventify = function(arr, callback) {
    arr.push = function() {
        Array.prototype.push.call(arr, ...arguments);
        callback(arr);
    };
};

// possible alternative if I can add reference to guildPlayer to check isPlaying
// Object.defineProperty(Array.prototype, 'pushSong', {
//     configurable: false,
//     value : function(){
//          this.push(arguments)
//          return true;
//     }
// });


const {
	createAudioPlayer,
	AudioPlayerStatus,
} = require('@discordjs/voice');

module.exports = class Player {
    constructor(_client) {
        this.client = _client;
        this.guildPlayers = new Map();
        
        this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
    }

    voiceStateUpdate = async (oldState, newState) => {
        const guildPlayer = this.getPlayer(oldState.guild.id);
        if (!guildPlayer || newState.guild.afkChannelId === newState.channelId || newState.member.user.bot) return;

        if (guildPlayer.timeout && newState?.channelId && newState.channelId === newState.guild?.me?.voice?.channelId) {
            clearTimeout(guildPlayer.timeout) //If user is joining bot's channel, remove idle timer if it exists
            console.log("user joined. timeout cleared!");
            return;
        }
        if (oldState.channelId !== oldState.guild.me.voice.channelId || !oldState.channel){
            return(0); //If user didn't leave bot's channel
        }
        if(oldState.channel.members.filter(m => !m.user.bot).size === 0 && guildPlayer.connection){
            if (guildPlayer.player.state.status === 'playing' && guildPlayer.responseChannel) {
                guildPlayer.responseChannel.send("No users remain in the channel, pausing player");
                guildPlayer.player.pause();
            }
            console.log("No users remain in the channel, setting timeout");
            guildPlayer.timeout = setTimeout(() => {
                console.log("timeout expired")
                guildPlayer.queue.length = 0;
                guildPlayer.player.stop(true);
                guildPlayer.isPlaying = false;
                guildPlayer.connection.disconnect();
                guildPlayer.connection = null;
            }, 15*60*1000)
        }
    }

    getPlayer(guild) {
        guild = this.client.guilds.resolve(guild);
        if (!guild) {
            console.log("error: no guild found in client")
        }
        if (this.guildPlayers.has(guild.id)) {
            return this.guildPlayers.get(guild.id);
        }
        const guildPlayer = {
            guildId: guild.id,
            responseChannel: null,
            player: createAudioPlayer(),
            queue: [],
            currentStream: null,
            connection: null,
            timeout: null,
            isPlaying: false,
            songRemoving: false,
        }
        guildPlayer.forceStart = () => {
            console.log('forcing start')
            guildPlayer.songRemoving = false;
            this.playTrack(guildPlayer.queue[0], guildPlayer)
        }
        guildPlayer.player.on(AudioPlayerStatus.Idle, async () => {
            if (guildPlayer.songRemoving) {
                console.log("song removal from web is going on, waiting for force start...");
                return;
            }
            console.log("player is idle, shifting queue");
            const doneItem = guildPlayer.queue.shift();
            if (doneItem) {
                broadcastDoneSong(guildPlayer.guildId, doneItem.song);
            }
            //play until queue is empty
            if (guildPlayer.queue.length > 0) {
                const item = guildPlayer.queue[0];
                console.log("now playing:", item.song.title)
                try {
                    this.playTrack(item, guildPlayer);
                } catch(e) {
                    console.log(e);
                    guildPlayer.queue.shift();
                }
            } else {
                console.log("queue is empty.  isPlaying = false");
                guildPlayer.isPlaying = false;
            }
        });

        eventify(guildPlayer.queue, () => {
            if (guildPlayer.player.state.status === 'paused') {
                console.log("eventify: player is paused, unpausing");
                guildPlayer.player.unpause();
            }
            if (!guildPlayer.isPlaying) {
                console.log("eventify: player is not playing, playing first track in queue")
                let item = guildPlayer.queue[0];
                try {
                    this.playTrack(item, guildPlayer);
                } catch(e) {
                    console.log(e);
                    guildPlayer.queue.shift();
                }
            } else {
                console.log("eventify: guild player is already playing, not forcing play")
            }
        });

        this.guildPlayers.set(guild.id, guildPlayer);
        return guildPlayer;
    }

    async playTrack(args, guildPlayer) {
        guildPlayer.isPlaying = true;
        let song = args.song;
        let isWeb = args.isWeb;

        // SPOTIFY
        if (song.source === "spotify") {
            const searched = await play.search(`${song.artist} ${song.title}`, {
                limit: 1
            });
            if (!searched || searched.length === 0) {
                console.log("no youtube video of that song was found")
                return;
            }
            song.link = searched[0].url;
        }

        let stream = await play.stream(song.link)
        let resource = createAudioResource(stream.stream, {
            inlineVolume: true,
            inputType: stream.type
        })
        resource.volume.setVolume(0.2);
        guildPlayer.currentStream = resource;
        guildPlayer.player.play(resource);
        // const guild = await Guild.findOne({guildId: message.guild.id});
        // guild.history.push(song);
        // guild.save();
        return;
    }
}
