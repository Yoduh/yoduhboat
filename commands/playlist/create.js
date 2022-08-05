const Playlist = require("../../db/Playlist");
const util = require('../../helpers/util');

const command = async (args, message, dbGuild, user) => {
    let songLink = null;
    if (args[args.length - 1].startsWith("https://")) {
        songLink = args.pop();
    }
    if (songLink && !songLink.includes("youtu") && !songLink.includes("spotify")) {
        message.reply("Not a valid youtube or spotify link")
        return;
    }
    let playlistName = args.join(" ");
    playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (playlist) {
        message.reply("A playlist on this server with that name already exists. Choose a different name")
        return;
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
    message.channel.send(res)
    return;
}

module.exports = command;