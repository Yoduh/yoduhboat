const { Console } = require("winston/lib/winston/transports");
const Song = require("../db/Song");

/*
args: number or number range, e.g. "9" or "1-9"
*/
const command = async (args, message, guildPlayer, isWeb) => {
    // WEB REMOVE
    if (isWeb) {
        const songId = args;
        const index = guildPlayer.queue.findIndex(q => q.song._id.toString() === songId);
        if (index === 0) {
            guildPlayer.songRemoving = true;
            guildPlayer.broadcaster = clearInterval(guildPlayer.broadcaster);
            // this takes < 500ms. dont forceStart (which sets songRemoving back to false) before the stop finishes (i.e. debounce!)
            let force = false;
            if (guildPlayer.player.state.status === 'paused') {
                guildPlayer.currentStream = null
                force = true;
            }
            guildPlayer.player.stop(force);  // force destroy playing resource if paused
        }
        guildPlayer.queue.splice(index, 1);
        return true;
    }

    // DISCORD REMOVE
    let remove = args.pop();
    let firstRemove = Number(remove.split("-")[0]);
    let lastRemove = null;
    if (remove.includes("-")) {
        lastRemove = Number(remove.split("-")[1]);
    } else {
        lastRemove = firstRemove;
    }
    if (firstRemove === '' || firstRemove === 0 || firstRemove > lastRemove || firstRemove > guildPlayer.queue.length || lastRemove > guildPlayer.queue.length) {
        message.reply(`Invalid removal choice. Use command \`.queue\` to find proper song numbers`)
        return;
    }
    let removeCount = lastRemove - firstRemove + 1;
    let removedItems = guildPlayer.queue.slice(firstRemove - 1, lastRemove);
    if (firstRemove === 1) {
        guildPlayer.player.stop();
        removeCount--;
    }
    guildPlayer.queue.splice(firstRemove - 1, removeCount);
    message.channel.send(`Removed ${removed(removedItems)} from queue`);
    return;
}

const removed = (removedItems) =>
{
    let res = "";
    if (removedItems.length === 1) {
        let song = removedItems[0].song;
        res = `**${song.artist ? song.artist + ' - ' : ''}${song.title}**`
    } else {
        res = `\`${removedItems.length}\` songs`
    }
    return res;
}

module.exports = command;