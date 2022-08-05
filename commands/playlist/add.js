const util = require('../../helpers/util');

const command = async (args, message, dbGuild) => {
    const songLink = args.pop();
    let playlistName = args.join(" ");
    let playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        message.reply("Can't find a playlist with that name.")
        return;
    }
    if (!songLink.startsWith("https://") && (!songLink.includes("youtu") || !songLink.includes("spotify"))) {
        message.reply("This command only works with youtube or spotify links.")
        return;
    }
    const songsAdded = await util.pushSongToPlaylist(songLink, message, playlist);
    message.channel.send(`Added \`${songsAdded.length ? songsAdded.length + '\` songs' : '1\` song'} to playlist \`${playlistName}\``);
    return;
}

module.exports = command;