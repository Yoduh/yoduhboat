const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    access_token: String,
    expires_in: Number,
    refresh_token: String,
    scope: String,
    token_type: String,
    playlists: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Playlist',
        default: []
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedAt: {
        type: Date,
        default: () => Date.now()
    }
})

module.exports = mongoose.model("User", userSchema);