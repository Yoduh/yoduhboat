const util = require('../../helpers/util');
const Playlist = require("../../db/Playlist");

const command = async (args, message, dbGuild, isWeb) => {
    const songLink = args.pop();
    let playlistName = args.join(" ");
    let playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        if (!isWeb) {
            message.reply("Can't find a playlist with that name.")
        }
        return false;
    }
    let dbPlaylist = await Playlist.findById(playlist._id).populate('songs')
    if (!songLink.startsWith("https://") && (!songLink.includes("youtu") || !songLink.includes("spotify"))) {
        if (!isWeb) {
            message.reply("This command only works with youtube or spotify links.")
        }
        return false;
    }
    const songsAdded = await util.pushSongToPlaylist(songLink, message, dbPlaylist);
    if (!isWeb) {
        message.channel.send(`Added \`${songsAdded.length ? songsAdded.length + '\` songs' : '1\` song'} to playlist \`${playlistName}\``);
    }
    return true;
}

module.exports = command;