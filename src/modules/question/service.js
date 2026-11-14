const Question = require("../../database/models/question/model");
const { getBotSettings } = require("../auth/service");
const { sendMessage } = require("../telegram/service");

async function submitQuestion(user, question) {
  if (!user?._id) {
    throw new Error("Invalid user");
  }

  const normalizedQuestion = question?.trim();

  if (!normalizedQuestion || normalizedQuestion.length > 2000) {
    throw new Error("Question must be between 1 and 2000 characters");
  }

  const savedQuestion = await Question.create({
    user: user._id,
    question: normalizedQuestion,
  });

  const settings = await getBotSettings();

  if (!settings.ownerTelegramId) {
    throw new Error("Owner Telegram ID is not configured");
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const username = user.username ? `@${user.username}` : "No username";

  const notification =
    "📩 New User Question\n\n" +
    `Question:\n${normalizedQuestion}\n\n` +
    "User Information:\n" +
    `Name: ${fullName || "Unknown"}\n` +
    `Username: ${username}\n` +
    `Telegram ID: ${user.telegramId}`;

  await sendMessage(settings.ownerTelegramId, notification);

  return savedQuestion;
}

module.exports = {
  submitQuestion,
};
