const mongoose = require("mongoose");

const botSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
    },

    ownerTelegramId: {
      type: Number,
      default: null,
    },

    setupCompleted: {
      type: Boolean,
      default: false,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    passwordVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BotSettings", botSettingsSchema);
