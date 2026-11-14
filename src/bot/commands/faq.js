const {
  isAdmin,
  isUserAuthenticated,
  getBotSettings,
} = require("../../modules/auth/service");

const { sendMessage } = require("../../modules/telegram/service");

const { getFAQById } = require("../../modules/faq/service");

const {
  saveConversation,
  setConversationState,
} = require("../utils/conversation");

const { showFAQList } = require("../menus/faq");

const faqCommands = ["/addqa", "/listqa", "/editqa", "/deleteqa"];

async function handleFAQCommand(user, chatId, text, command) {
  if (!faqCommands.includes(command)) {
    return false;
  }

  const isOwner = await isAdmin(user);

  // LIST FAQS
  if (command === "/listqa") {
    if (!(await isUserAuthenticated(user))) {
      const settings = await getBotSettings();

      if (!settings.passwordHash) {
        await sendMessage(
          chatId,
          "The bot is not ready yet. Please contact the owner.",
        );
        return true;
      }

      await setConversationState(user, "awaiting_shared_password");

      await sendMessage(
        chatId,
        "Your session has expired. Please send the current shared password.",
      );

      return true;
    }

    await showFAQList(chatId, null, 1, user);
    return true;
  }

  // ADMIN-ONLY COMMANDS
  if (!isOwner) {
    await sendMessage(chatId, "Access denied.");
    return true;
  }

  const args = text.split(/\s+/).slice(1);

  // ADD FAQ
  if (command === "/addqa") {
    await saveConversation(user, "awaiting_faq_question");

    await sendMessage(chatId, "Send the FAQ question.");
    return true;
  }

  return false;
}

module.exports = handleFAQCommand;
