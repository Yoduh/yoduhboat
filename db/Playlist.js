const mongoose = require("mongoose");
const Song = require("./Song");

const playlistSchema = new mongoose.Schema({
    name: String,
    namelower: String,
    songs: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Song',
        default: []
    },
    duration: { // total duration in seconds
        type: Number,
        default: 0
    },
    source: String, // original source for playlist if created using playlist link
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    public: {
        type: Boolean,
        default: true
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
});

playlistSchema.post('remove', async (doc) => {
    await Song.deleteMany({ '_id': { $in: doc.songs } })
});

module.exports = mongoose.model("Playlist", playlistSchema);