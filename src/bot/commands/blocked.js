const { isAdmin, getBlockedUsers } = require("../../modules/auth/service");

const {
  sendMessage,
  editMessageText,
} = require("../../modules/telegram/service");

async function showBlockedUsers(chatId, user, page = 1, messageId) {
  if (!(await isAdmin(user))) {
    await sendMessage(chatId, "Access denied.");
    return;
  }

  const result = await getBlockedUsers(user, page, 8);

  if (result.total === 0) {
    await sendMessage(chatId, "There are no blocked users.");
    return;
  }

  const lines = result.users.map((blockedUser, index) => {
    const fullName = [blockedUser.firstName, blockedUser.lastName]
      .filter(Boolean)
      .join(" ");

    const username = blockedUser.username
      ? `@${blockedUser.username}`
      : "No username";

    return `${(result.page - 1) * 8 + index + 1}. ${fullName}\n${username}\nID: ${blockedUser.telegramId}\nFailed attempts: ${blockedUser.failedPasswordAttempts}`;
  });

  const keyboard = result.users.map((blockedUser) => [
    {
      text: `Unblock ${blockedUser.firstName}`,
      callback_data: `blocked:confirm:${blockedUser.telegramId}:${result.page}`,
    },
  ]);

  const navigation = [];

  if (result.page > 1) {
    navigation.push({
      text: "‹ Previous",
      callback_data: `blocked:page:${result.page - 1}`,
    });
  }

  if (result.page < result.totalPages) {
    navigation.push({
      text: "Next ›",
      callback_data: `blocked:page:${result.page + 1}`,
    });
  }

  if (navigation.length) {
    keyboard.push(navigation);
  }

  const text = `Blocked Users (${result.total})\n\n${lines.join("\n\n")}`;

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, options);
  } else {
    await sendMessage(chatId, text, options);
  }
}

async function handleBlockedCommand(user, chatId, command) {
  if (command !== "/blocked") {
    return false;
  }

  if (!(await isAdmin(user))) {
    await sendMessage(chatId, "Access denied.");
    return true;
  }

  await showBlockedUsers(chatId, user);

  return true;
}

module.exports = {
  handleBlockedCommand,
  showBlockedUsers,
};
