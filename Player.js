const User = require("./db/User");
const commands = require('./commands');

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
        if (!guildPlayer) return;

        // entrance music for users
        if (newState.channelId && newState.channelId !== oldState.channelId && !newState.member.user.bot) {
            let joinedUser = newState.member.user.username.toLowerCase();
            console.log(`checking ${joinedUser} for entrance music`);
            let user = await User.findOne({userId: newState.member.user.id});
            let userSound = user?.entrance?.sound;
            if (userSound && user.entrance.enabled) {
                console.log(`playing entrance music ${userSound}`);
                commands.play([userSound], false, true, newState, this)
                return;
            } else {
                console.log("entrance music not enabled for user, continuing...")
            }
        }
        if (oldState.channelId !== oldState.guild.me.voice.channelId || !oldState.channel){
            return(0); //If it's not the channel the bot's in
        }
        if(oldState.channel.members.size === 1 && guildPlayer.connection){
            console.log("no users remain in channel, leaving");  //Leave the channel
            guildPlayer.connection.disconnect();
            guildPlayer.connection.destroy();
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
            player: createAudioPlayer(),
            queue: [],
            connection: null,
            timeout: null
        }
        guildPlayer.player.on(AudioPlayerStatus.Idle, async () => {
            //play until queue is empty
            if (guildPlayer.queue.length > 0) {
                let item = guildPlayer.queue.shift();
                await commands.play(item.args, item.isWeb, item.isEntrance, item.message, this);
            }
        });

        this.guildPlayers.set(guild.id, guildPlayer);
        return guildPlayer;
    }
}
