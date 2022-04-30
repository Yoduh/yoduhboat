const mongoose = require("mongoose");

const soundSchema = new mongoose.Schema({
    name: String,
    file: String,
    link: String,
    description: {
        type: String,
        default: ""
    },
    start: Number, // seconds
    startTime: String, // timestamp
    end: Number, // seconds
    endTime: String, // timestamp
    user: String,
    duration: Number,
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

module.exports = mongoose.model("sound", soundSchema);