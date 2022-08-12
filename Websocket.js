const WebSocket = require('ws');
const url = require('url');

global.wss = new WebSocket.Server({ port: 7071 });

function wssStart() {
  wss.on('connection', (ws, req) => {
      const parameters = url.parse(req.url, true);
      ws.id = parameters.query.userId;

      ws.on('message', async messageBuf => {
          const message = clientResponse(messageBuf.toString());
          if (Object.hasOwn(message, 'guild')) {
              ws.guild = message.guild;
              const voiceChannel = await isConnectedToVoice(message.guild, ws.id);
              const guildPlayer = masterPlayer.getPlayer(message.guild)
              guildPlayer.socketListeners.add(ws.id);
              ws.guildPlayer = guildPlayer;
              console.log('ws opened from web', ws.id)
              const response = { 
                isPlaying: guildPlayer.isPlaying, 
                isPaused: guildPlayer.player.state.status === 'paused' ? true : false, 
                queue: guildPlayer.queue.map(q => q.song), // sending 'queue' first sets playTime = 0 on frontend
                initialTime: guildPlayer?.currentStream?.playbackDuration, // so always send playTime after queue if sending together
                botVoiceChannel: guildPlayer.voiceChannel ? guildPlayer.voiceChannel : null,
                userVoiceId: voiceChannel
              }
              console.log('response: ', response);
              ws.send(JSON.stringify(response));
          }
          else if (message === 'rejoin') {
            const guildPlayer = ws.guildPlayer
            const response = { 
              isPlaying: guildPlayer.isPlaying, 
              isPaused: guildPlayer.player.state.status === 'paused' ? true : false, 
              queue: guildPlayer.queue.map(q => q.song),
              playTime: guildPlayer?.currentStream?.playbackDuration
            }
            console.log('rejoin response: ', response);
            ws.send(JSON.stringify(response));
          }
          else if (message === 'ping') {
            ws.send('pong');
          }
          else {
            console.log('unhandled message', message)
          }
      })

      ws.on('close', () => {
          ws.guildPlayer?.socketListeners.delete(ws.id);
          wss.clients.delete(ws);
      })
  })
}

function updateWebClients(command, guildId, guildPlayer) {
  console.log('update command', command);
  const guildWS = [...wss.clients].filter(ws => {
      return ws.guild == guildId;
  });
  guildWS.forEach(ws => {
      switch(command) {
          case "play":
          case "playnext":
          case "shuffle":
            ws.send(JSON.stringify({ isPlaying: true, queue: guildPlayer.queue.map(q => q.song) }));
            break;
          case "remove":
            ws.send(JSON.stringify({ isPlaying: guildPlayer.isPlaying, queue: guildPlayer.queue.map(q => q.song) }));
            break;
          case "stop":
            ws.send(JSON.stringify({ stopped: true }));
            break;
          case "pause":
            console.log('pause status: ', guildPlayer.player.state.status)
            if (guildPlayer.player.state.status !== 'paused') {
              ws.send(JSON.stringify({ isPaused: false, playTime: guildPlayer?.currentStream?.playbackDuration }));
            } else {
              ws.send(JSON.stringify({ isPaused: true, playTime: guildPlayer?.currentStream?.playbackDuration }));
            }
          case "sync":
            ws.send(JSON.stringify({
              playTime: guildPlayer?.currentStream?.playbackDuration
            }));
            break;
          case "join":
            ws.send(JSON.stringify({
              botVoiceChannel: guildPlayer.voiceChannel ? guildPlayer.voiceChannel : null
            }));
            break;
          case "default":
            console.log('unhandled update for command:', command)
      }
  });
}

async function isConnectedToVoice(guildId, userId) {
  const guild = await masterPlayer.client.guilds.fetch(guildId); // Getting the guild.
  const member = await guild.members.fetch(userId); // Getting the member.
  if (member.voice.channel) {
      return member.voice.channel.id;
  } else {
      return null;
  };
}

function broadcastDoneSong(guildId, song) {
  const guildWS = [...wss.clients].filter(ws => {
    return ws.guild == guildId;
  });
  guildWS.forEach(ws => {
    ws.send(JSON.stringify({ doneSong: song }));
  });
}

function clientResponse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

exports.updateWebClients = updateWebClients;
exports.broadcastDoneSong = broadcastDoneSong;
exports.wssStart = wssStart;