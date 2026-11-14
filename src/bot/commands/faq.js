const { isAdmin } = require("../../modules/auth/service");

const { getFAQById } = require("../../modules/faq/service");

const { sendMessage } = require("../../modules/telegram/service");

const { saveConversation } = require("../utils/conversation");
const { showFAQList } = require("../menus/faq");

const faqCommands = ["/addqa", "/listqa", "/editqa", "/deleteqa"];

async function handleFAQCommand(user, chatId, text, command) {
  if (!faqCommands.includes(command)) {
    return false;
  }

  if (!(await isAdmin(user))) {
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

  // LIST FAQS
  if (command === "/listqa") {
    await showFAQList(chatId, null, 1, user);
    return true;
  }

  // EDIT FAQ
  if (command === "/editqa") {
    const faqId = args[0];

    if (!faqId) {
      await sendMessage(chatId, "Usage: /editqa FAQ_ID");
      return true;
    }

    const faq = await getFAQById(faqId);

    if (!faq) {
      await sendMessage(chatId, "FAQ not found.");
      return true;
    }

    await saveConversation(user, "awaiting_faq_edit_question", {
      faqId: faq._id.toString(),
      originalQuestion: faq.question,
      originalAnswer: faq.answer,
      page: 1,
    });

    await sendMessage(
      chatId,
      `Current question:\n${faq.question}\n\nSend the new question, or /skip to keep it.`,
    );

    return true;
  }

  // DELETE FAQ - CONFIRMATION
  if (command === "/deleteqa") {
    const faqId = args[0];

    if (!faqId) {
      await sendMessage(chatId, "Usage: /deleteqa FAQ_ID");
      return true;
    }

    const faq = await getFAQById(faqId);

    if (!faq) {
      await sendMessage(chatId, "FAQ not found.");
      return true;
    }

    await sendMessage(
      chatId,
      `Are you sure you want to delete this FAQ?\n\n${faq.question}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Yes, delete",
                callback_data: `faq:confirm_delete:${faqId}:1`,
              },
              {
                text: "Cancel",
                callback_data: `faq:admin:${faqId}:1`,
              },
            ],
            [
              {
                text: "⌂ Main Menu",
                callback_data: "main:menu",
              },
            ],
          ],
        },
      },
    );

    return true;
  }

  return false;
}

module.exports = handleFAQCommand;
