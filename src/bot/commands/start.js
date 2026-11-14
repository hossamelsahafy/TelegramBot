const {
  getBotSettings,
  isAdmin,
  isUserAuthenticated,
} = require("../../modules/auth/service");
const { getFAQs } = require("../../modules/faq/service");
const { sendMessage } = require("../../modules/telegram/service");
async function showFAQs(chatId, page = 1) {
  const result = await getFAQs(page, 8);

  if (!result.total) {
    await sendMessage(chatId, "There are no FAQs available yet.");
    return;
  }

  const questions = result.faqs
    .map((faq, index) => `${index + 1}. ${faq.question}`)
    .join("\n");

  await sendMessage(
    chatId,
    `Frequently Asked Questions\n\n${questions}\n\nUse /faq to browse questions.`,
  );
}
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

  user.conversationState = "awaiting_shared_password";
  await user.save();

  await sendMessage(
    chatId,
    "Welcome, owner!\n\n" +
      "Password Management:\n" +
      "/setpassword - Set the shared password\n" +
      "/changepassword - Change the shared password\n\n" +
      "FAQ Management:\n" +
      "/addqa - Add a question and answer\n" +
      "/listqa - List all FAQs\n" +
      "/editqa FAQ_ID - Edit an FAQ\n" +
      "/deleteqa FAQ_ID - Delete an FAQ\n\n" +
      "General:\n" +
      "/help - Show help\n" +
      "/cancel - Cancel the current operation",
  );
}

module.exports = startCommand;
