const {
  authenticateTelegramUser,
  isAdmin,
  unblockUser,
} = require("../../modules/auth/service");

const {
  answerCallbackQuery,
  editMessageText,
} = require("../../modules/telegram/service");

const { showBlockedUsers } = require("../commands/blocked");

async function handleBlockedCallback(callbackQuery) {
  const message = callbackQuery.message;
  const callbackData = callbackQuery.data || "";

  if (!message?.chat || message.chat.type !== "private") {
    await answerCallbackQuery(callbackQuery.id, "Private chat only.", true);
    return;
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const user = await authenticateTelegramUser(callbackQuery.from);

  if (user.isBlocked || !(await isAdmin(user))) {
    await answerCallbackQuery(callbackQuery.id, "Access denied.", true);
    return;
  }

  const parts = callbackData.split(":");
  const operation = parts[1];
  const telegramId = parts[2];
  const page = Math.max(1, Number(parts[3]) || 1);

  await answerCallbackQuery(callbackQuery.id);

  // PAGINATION
  if (operation === "page") {
    await showBlockedUsers(
      chatId,
      user,
      Math.max(1, Number(telegramId) || 1),
      messageId,
    );
    return;
  }

  // CONFIRM UNBLOCK
  if (operation === "confirm") {
    if (!/^\d+$/.test(telegramId || "")) {
      await editMessageText(chatId, messageId, "Invalid user ID.");
      return;
    }

    await editMessageText(
      chatId,
      messageId,
      `Are you sure you want to unblock this user?\n\nTelegram ID: ${telegramId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Yes, unblock",
                callback_data: `blocked:unblock:${telegramId}:${page}`,
              },
              {
                text: "Cancel",
                callback_data: `blocked:cancel:${page}`,
              },
            ],
          ],
        },
      },
    );
    return;
  }

  // CANCEL
  if (operation === "cancel") {
    await showBlockedUsers(chatId, user, page, messageId);
    return;
  }

  // UNBLOCK
  if (operation === "unblock") {
    if (!/^\d+$/.test(telegramId || "")) {
      await editMessageText(chatId, messageId, "Invalid user ID.");
      return;
    }

    const unblockedUser = await unblockUser(telegramId, user);

    if (!unblockedUser) {
      await editMessageText(
        chatId,
        messageId,
        "This user is no longer blocked.",
      );
      return;
    }

    await editMessageText(
      chatId,
      messageId,
      `User ${unblockedUser.firstName} has been unblocked successfully.\n\nThey must log in again using the current shared password.`,
    );
    return;
  }

  await editMessageText(chatId, messageId, "Unknown action.");
}

module.exports = handleBlockedCallback;
