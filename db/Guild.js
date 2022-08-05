const mongoose = require("mongoose");

const guildSchema = new mongoose.Schema({
    name: String,
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    allowedChannels: [String],
    history: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Song',
        default: []
    },
    playlists: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Playlist'
    },
    joinedDate: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedAt: {
        type: Date,
        default: () => Date.now()
    }
})

module.exports = mongoose.model("Guild", guildSchema);