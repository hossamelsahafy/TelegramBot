const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },

    username: {
      type: String,
      default: null,
    },

    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    conversationState: {
      type: String,
      enum: [
        null,
        "awaiting_owner_secret",
        "awaiting_initial_password",
        "awaiting_new_password",
        "awaiting_shared_password",
        "awaiting_faq_question",
        "awaiting_faq_answer",
        "awaiting_faq_edit_question",
        "awaiting_faq_edit_answer",
      ],
      default: null,
    },
    conversationData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    isAuthenticated: {
      type: Boolean,
      default: false,
    },

    authenticatedPasswordVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
