const {
  getBotSettings,
  isAdmin,
  isUserAuthenticated,
} = require("../../modules/auth/service");

const { sendMessage } = require("../../modules/telegram/service");

const { clearConversation } = require("../utils/conversation");

async function startCommand(chatId, user) {
  const settings = await getBotSettings();

  if (!settings.setupCompleted) {
    await clearConversation(user);

    await sendMessage(
      chatId,
      "Welcome!\n\nThe bot has not been configured yet. The owner must send /setup to begin setup.",
    );
    return;
  }

  // OWNER
  if (await isAdmin(user)) {
    await clearConversation(user);

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
      "Welcome, owner!\n\n" +
        "Password Management:\n" +
        "/setpassword - Set the shared password\n" +
        "/changepassword - Change the shared password\n\n" +
        "FAQ Management:\n" +
        "/addqa - Add a question and answer\n" +
        "/listqa - List all FAQs\n\n" +
        "User Management:\n" +
        "/blocked - View and manage blocked users\n\n" +
        "General:\n" +
        "/help - Show help\n" +
        "/cancel - Cancel the current operation",
    );
    return;
  }

  // USER
  if (!settings.passwordHash) {
    await clearConversation(user);

    await sendMessage(
      chatId,
      "The bot is not ready yet. Please contact the owner.",
    );
    return;
  }

  if (await isUserAuthenticated(user)) {
    await clearConversation(user);

    await sendMessage(
      chatId,
      `Welcome back ${user.firstName}!\nYou are authenticated.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📚 Show FAQs",
                callback_data: "faq:page:1",
              },
            ],
          ],
        },
      },
    );
    return;
  }

  await clearConversation(user);

  user.conversationState = "awaiting_shared_password";
  await user.save();

  await sendMessage(
    chatId,
    "Welcome!\n\nPlease send the shared password to access the bot.",
  );
}

module.exports = startCommand;
