const util = require('../helpers/util');

const command = async (args, message, guildPlayer) => {
    if (!guildPlayer || guildPlayer.queue.length === 0) {
        message.channel.send("Queue is empty");
        return;
    }
    let queue = guildPlayer.queue;
    let page = args[0] ? args[0] : 1;
    let response = `\nPage **${page}** of **${Math.ceil(queue.length / 10)}**\n`;

    for(let i = 0; i < 10 && i + (page - 1) * 10 < queue.length; i++) {
        let num = i + (page - 1) * 10;
        response += `\n\`[${num + 1}]\` ${num + 1 === 1 ? '▶ ' : ''}**`+
            `${queue[num].song.artist ? queue[num].song.artist + ' - ' : ''}${queue[num].song.title}**`+
            ` added by **${queue[num].song.addedBy}** \`[${queue[num].song.durationTime}]\``
    }
    let totalDuration = 0;
    guildPlayer.queue.forEach(q => {
        totalDuration += q.song.duration
    })
    totalDuration = util.secondsToTimestamp(totalDuration);
    response += `\n\nThere are **${guildPlayer.queue.length}** tracks with a remaining length of **[${totalDuration}]** in the queue.`;
    message.channel.send(response);
}

module.exports = command;