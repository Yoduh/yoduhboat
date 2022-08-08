const { createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');

const command = async (seekTime, guildPlayer) => {
  let stream = await play.stream(guildPlayer.queue[0].song.link, { seek: seekTime / 1000 })
  let resource = createAudioResource(stream.stream, {
    inlineVolume: true,
    inputType: stream.type
  })
  resource.volume.setVolume(0.2);
  resource.playbackDuration = seekTime
  guildPlayer.currentStream = resource;
  guildPlayer.player.play(resource);
  return true;
}

module.exports = command;