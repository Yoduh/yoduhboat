const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    access_token: String,
    expires_in: Number,
    refresh_token: String,
    scope: String,
    token_type: String,
    favorites: [String],
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedAt: {
        type: Date,
        default: () => Date.now()
    },
    entrance: {
        enabled: {
            type: Boolean,
            default: false
        },
        sound: {
            type: String,
            default: null
        }
    }
})

module.exports = mongoose.model("User", userSchema);