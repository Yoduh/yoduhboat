const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    link: String,
    source: String,     // 'youtube' or 'spotify'
    duration: Number,    // 205 (seconds)
    durationTime: String,    // '03:25'
    addedBy: String,
    avatar: String, // addedBy avatar
    thumbnail: String,
    playCount: {
        type: Number,
        default: 0
    },
    tags: [Array],
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

module.exports = mongoose.model("Song", songSchema);