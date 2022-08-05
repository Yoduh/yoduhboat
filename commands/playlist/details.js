/* 
will not send if response is over 2000 characters.  25 songs per page shouldn't 
hit that amount unless people add a lot of songs with really long titles...
*/
const Song = require("../../db/Song");
const util = require('../../helpers/util');

const command = async (args, message, dbGuild) => {
    let displayPage = 1;
    if (!isNaN(args[args.length - 1])) {
        displayPage = args.pop();
    }
    let playlistName = args.join(" ");
    let playlist = dbGuild.playlists.find(p => p.namelower === playlistName.toLowerCase());
    if (!playlist) {
        message.reply("Can't find a playlist with that name.")
        return;
    }
    let response = `\nPage **${displayPage}** of **${Math.ceil(playlist.songs.length / 25)}**\n`;

    for(let i = 0; i < 25 && i + (displayPage - 1) * 25 < playlist.songs.length; i++) {
        let num = i + (displayPage - 1) * 25;
        let song = await Song.findById(playlist.songs[num]);
        response += `\n\`[${num + 1}]\` **${song.artist ? song.artist + ' - ' : ''}${song.title}** added by **${song.addedBy}** \`[${song.durationTime}]\``
    }
    totalDuration = util.secondsToTimestamp(playlist.duration);
    response += `\n\n**${playlist.songs.length}** songs with total duration of **[${totalDuration}]**.`;
    message.channel.send(response);
    return;
}

module.exports = command;