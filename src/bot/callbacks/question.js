const {
  authenticateTelegramUser,
  isAdmin,
  isUserAuthenticated,
} = require("../../modules/auth/service");

const {
  answerCallbackQuery,
  sendMessage,
  editMessageText,
} = require("../../modules/telegram/service");

const {
  setConversationState,
  clearConversation,
} = require("../utils/conversation");

async function handleQuestionCallback(callbackQuery) {
  // Acknowledge immediately to avoid Telegram callback timeout.
  await answerCallbackQuery(callbackQuery.id);

  const message = callbackQuery.message;

  if (!message || message.chat.type !== "private") {
    return;
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const callbackData = callbackQuery.data || "";
  const operation = callbackData.split(":")[1];

  const user = await authenticateTelegramUser(callbackQuery.from);

  if (user.isBlocked) {
    await sendMessage(chatId, "Your account is blocked.");
    return;
  }

  if (await isAdmin(user)) {
    await sendMessage(
      chatId,
      "This feature is available to regular users only.",
    );
    return;
  }

  if (!(await isUserAuthenticated(user))) {
    await sendMessage(chatId, "Please authenticate first using /start.");
    return;
  }

  if (operation === "ask") {
    await setConversationState(user, "awaiting_user_question");

    await editMessageText(
      chatId,
      messageId,
      "Please type your question in a single message.\n\nThe owner will receive your question.\n\nYou can cancel using /cancel or the button below.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✖ Cancel",
                callback_data: "question:cancel",
              },
            ],
          ],
        },
      },
    );

    return;
  }

  if (operation === "cancel") {
    await clearConversation(user);

    await editMessageText(chatId, messageId, "Question submission cancelled.");

    return;
  }
}

module.exports = handleQuestionCallback;
