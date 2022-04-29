const mongoose = require("mongoose");

const soundSchema = new mongoose.Schema({
    name: String,
    file: Buffer,
    link: String,
    description: String,
    start: Number, // seconds
    startTime: String, // timestamp
    end: Number, // seconds
    endTime: String, // timestamp
    user: String,
    duration: Number,
    playCount: Number,
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