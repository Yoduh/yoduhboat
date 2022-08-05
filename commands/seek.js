const { createAudioResource } = require('@discordjs/voice');

const command = async (guildPlayer) => {
  // let stream =  { ...guildPlayer.player.state.resource.playStream };
  // let resource = createAudioResource(stream, {
  //   inlineVolume: true,
  //   inputType: stream.type
  // })
  // resource.volume.setVolume(0.2);
  // console.log('resource', resource)
  console.log('guildPlayer.currentStream', guildPlayer.currentStream);
  guildPlayer.player.play(guildPlayer.currentStream, {seek: 20000 });
}

module.exports = command;