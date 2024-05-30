const Song = require("../../db/Song");

// args = [ playlist name, indeces to remove("X" or "X-Y") ]
const command = async (args, message, dbGuild, isWeb) => {
    if (args.length < 2 && !isWeb) {
        message.reply("Incorrect command usage. Lookup command format with \`.commands\`!")
        return false;
    }
    let remove = args.pop();
    let playlistName = args.join(" ");
    let playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist && !isWeb) {
        message.reply("Can't find a playlist with that name.")
        return false;
    }
    let firstRemove = Number(remove.split("-")[0]);
    let lastRemove = null;
    if (remove.includes("-")) {
        lastRemove = Number(remove.split("-")[1]);
    } else {
        lastRemove = firstRemove;
    }
    if (!isWeb && (firstRemove === '' || firstRemove === 0 || firstRemove > lastRemove || firstRemove > playlist.songs.length || lastRemove > playlist.songs.length)) {
        message.reply(`Invalid removal choice. Use command \`.playlist display ${playlistName}\` to find proper song numbers`)
        return false;
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
    if (!isWeb) {
        message.channel.send(`Removed \`${removeCount}\` songs from playlist`);
    }
    return true;
}

module.exports = command;