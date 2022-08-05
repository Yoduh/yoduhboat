const WebSocket = require('ws');
const url = require('url');

global.wss = new WebSocket.Server({ port: 7071 });
wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true);
    ws.id =  parameters.query.userId;

    ws.on('message', messageBuf => {
        const message = JSON.parse(messageBuf.toString());
        if (Object.hasOwn(message, 'guild')) {
            ws.guild = message.guild;
            const guildPlayer = masterPlayer.getPlayer(message.guild)
            ws.send(JSON.stringify({ 
              isPlaying: guildPlayer.isPlaying, 
              isPaused: guildPlayer.player.state.status === 'paused' ? true : false, 
              playTime: guildPlayer.player.state?.playbackDuration,
              queue: guildPlayer.queue.map(q => q.song) 
            }));
        }
        
        const response = 'I HEAR YOU';

        wss.clients.forEach((client) => {
            console.log('sending response', response);
            console.log('to client', client.id)
            client.send(response);
        });
    })

    ws.on('close', () => {
        console.log('closed')
        wss.clients.delete(ws);
    })
})

function updateWebClients(command, guildId, guildPlayer) {
  console.log('broadcasting update to clients')
  const guildWS = [...wss.clients].filter(ws => {
      return ws.guild == guildId;
  });
  console.log('arr length', guildWS.length)
  guildWS.forEach(ws => {
      switch(command) {
          case "play":
          case "playnext":
            ws.send(JSON.stringify({ isPlaying: true, queue: guildPlayer.queue.map(q => q.song) }));
            break;
          case "stop":
            ws.send(JSON.stringify({ isPlaying: false, queue: guildPlayer.queue.map(q => q.song) }));
            break;
          case "pause":
            console.log('broadcasting pause status')
            if (guildPlayer.player.state.status === 'playing') {
              ws.send(JSON.stringify({ isPaused: false }))
            } else {
              ws.send(JSON.stringify({ isPaused: true }))
            }
      }
  });
}

function broadcastDoneSong(guildId, song) {
  const guildWS = [...wss.clients].filter(ws => {
    return ws.guild == guildId;
  });
  guildWS.forEach(ws => {
    ws.send(JSON.stringify({ doneSong: song }));
  });
}

exports.updateWebClients = updateWebClients;
exports.broadcastDoneSong = broadcastDoneSong;