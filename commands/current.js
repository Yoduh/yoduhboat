const play = require('play-dl');
const { MessageEmbed } = require('discord.js');
const util = require('../helpers/util');

const command = async (message, guildPlayer) => {
    if (guildPlayer && ['playing', 'paused'].includes(guildPlayer.player.state.status)) {
        const queueItem = guildPlayer.queue[0];
        const embed = await youtubeEmbed(queueItem.song, guildPlayer.player.state.playbackDuration)
        message.channel.send({ embeds: [embed]})
    } else {
        message.channel.send("No music is currently playing")
    }
}

const youtubeEmbed = async (song, playTime) => {
    const songInfo = await play.video_info(song.link)
    const currentTime = util.secondsToTimestamp(playTime / 1000);
    let description = songInfo.video_details.description;
    if (description.length > 256) {
        description = description.slice(0, 256) + "...";
    } 
    return new MessageEmbed()
    .setColor('#0099ff')
    .setAuthor({ name: songInfo.video_details.channel.name, 
        iconURL: songInfo.video_details.channel.icons.length > 2 ? songInfo.video_details.channel.icons[2].url : '',
        url: songInfo.video_details.channel.url })
	.setTitle(songInfo.video_details.title)
    .setDescription('')
	.setURL(songInfo.video_details.url)
	.setThumbnail(songInfo.video_details?.thumbnails[0].url)
    .addFields(
		{ name: '**Time**', value: `[${currentTime}/${songInfo.video_details.durationRaw}]` },
		{ name: '**Description**', value: description  },
	)
    .setFooter({ text: `Requested by ${song.addedBy}`});
}

module.exports = command;