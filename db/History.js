const mongoose = require("mongoose");
const Guild = require("./Guild");

const historySchema = new mongoose.Schema({
    action: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    guildId: { // discord ID
      type: String,
      required: true
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    }
})

historySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const history = this;
  const guild = await Guild.findOne({ history: history._id})
  if (guild) {
    const idx = guild.history.findIndex(h => h._id.valueOf() === history._id.valueOf())
    guild.history.splice(idx, 1)
    guild.save()
  }
  next();
});

module.exports = mongoose.model("History", historySchema);