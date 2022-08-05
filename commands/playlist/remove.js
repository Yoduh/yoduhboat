const Song = require("../../db/Song");

const command = async (args, message, dbGuild) => {
    if (args.length < 2) {
        message.reply("Incorrect command usage. Lookup command format with \`.commands\`!")
        return;
    }
    let remove = args.pop();
    let playlistName = args.join(" ");
    let playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        message.reply("Can't find a playlist with that name.")
        return;
    }
    let firstRemove = Number(remove.split("-")[0]);
    let lastRemove = null;
    if (remove.includes("-")) {
        lastRemove = Number(remove.split("-")[1]);
    } else {
        lastRemove = firstRemove;
    }
    if (firstRemove === '' || firstRemove === 0 || firstRemove > lastRemove || firstRemove > playlist.songs.length || lastRemove > playlist.songs.length) {
        message.reply(`Invalid removal choice. Use command \`.playlist display ${playlistName}\` to find proper song numbers`)
        return;
    }
    let removeCount = lastRemove - firstRemove + 1;
    let removedSongs = playlist.songs.splice(firstRemove - 1, removeCount);
    let songDetails = await Song.find({
        '_id': { $in: removedSongs }
    });
    const res = await Song.deleteMany({
        '_id': { $in: removedSongs }
    });
    const removedDuration = songDetails.reduce((previousValue, currentValue) => 
        previousValue + currentValue.duration, 0);
    playlist.duration -= removedDuration;
    playlist.save();
    message.channel.send(`Removed \`${removeCount}\` songs from playlist`);
    return;
}

module.exports = command;