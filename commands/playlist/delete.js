const command = async (args, message, dbGuild, isWeb = false) => {
    playlistName = args.join(" ");
    playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        if (!isWeb) {
            message.reply("Can't find a playlist with that name.")
        }
        return;
    }
    await playlist.remove();
    dbGuild.playlists.splice(dbGuild.playlists.indexOf(playlist), 1);
    await dbGuild.save();
    if (!isWeb) {
        message.channel.send("Playlist deleted");
    }
    return;
}

module.exports = command;