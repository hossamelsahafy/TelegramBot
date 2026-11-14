const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },

    createdBy: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

faqSchema.index({ createdAt: -1 });

module.exports = mongoose.models.FAQ || mongoose.model("FAQ", faqSchema);
