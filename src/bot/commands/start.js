const {
  getBotSettings,
  isAdmin,
  isUserAuthenticated,
} = require("../../modules/auth/service");

const { sendMessage } = require("../../modules/telegram/service");

async function startCommand(chatId, user) {
  const settings = await getBotSettings();

  if (!settings.setupCompleted) {
    await sendMessage(
      chatId,
      "Welcome!\n\nThe bot has not been configured yet. The owner must send /setup to begin setup.",
    );
    return;
  }

  if (await isAdmin(user)) {
    if (!settings.passwordHash) {
      user.conversationState = "awaiting_initial_password";
      await user.save();

      await sendMessage(
        chatId,
        "Welcome, owner!\n\nSend the shared password you want to create.",
      );
      return;
    }

    await sendMessage(
      chatId,
      "Welcome, owner!\n\nAvailable commands:\n/setpassword - Set the shared password\n/changepassword - Change the shared password\n/help - Help",
    );
    return;
  }

  if (!settings.passwordHash) {
    await sendMessage(
      chatId,
      "The bot is not ready yet. Please contact the owner.",
    );
    return;
  }

  if (await isUserAuthenticated(user)) {
    user.conversationState = null;
    await user.save();

    await sendMessage(
      chatId,
      `Welcome back ${user.firstName}!\nYou are authenticated.`,
    );
    return;
  }

  user.conversationState = "awaiting_shared_password";
  await user.save();

  await sendMessage(
    chatId,
    "Welcome!\n\nPlease send the shared password to access the bot.",
  );
}

module.exports = startCommand;
