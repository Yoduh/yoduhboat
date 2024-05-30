const Playlist = require("../../db/Playlist");
const util = require('../../helpers/util');

const command = async (args, message, dbGuild, user, isWeb) => {
    let songLink = null;
    if (args[args.length - 1].startsWith("https://")) {
        songLink = args.pop();
    }
    if (songLink && !songLink.includes("youtu") && !songLink.includes("spotify") && !isWeb) {
        message.reply("Not a valid youtube or spotify link")
        return false;
    }
    let playlistName = args.join(" ");
    if (playlistName.includes("youtu") || playlistName.includes("spotify")) {
        if (!isWeb) {
            message.reply("Can't create playlist that includes youtube or spotify in the name for REASONS. Choose a different name")
        }
        return false;
    }
    playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (playlist && !isWeb) {
        message.reply("A playlist on this server with that name already exists. Choose a different name")
        return false;
    } 
    const newPlaylist = await Playlist.create({
        name: playlistName,
        namelower: playlistName.toLowerCase(),
        createdBy: user.id
    });
    dbGuild.playlists.push(newPlaylist);
    await dbGuild.save();
    let res = `New playlist \`${playlistName}\` created`;
    if (songLink) {
        const songsAdded = await util.pushSongToPlaylist(songLink, message, newPlaylist);
        res += ` with \`${songsAdded.length}\` songs`
    }
    if (!isWeb) {
        message.channel.send(res)
    }
    return true;
}

module.exports = command;