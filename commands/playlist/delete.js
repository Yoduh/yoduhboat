const command = async (args, message, dbGuild) => {
    playlistName = args.join(" ");
    playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        message.reply("Can't find a playlist with that name.")
        return;
    }
    await playlist.remove();
    dbGuild.playlists.splice(dbGuild.playlists.indexOf(playlist), 1);
    await dbGuild.save();
    message.channel.send("Playlist deleted");
    return;
}

module.exports = command;