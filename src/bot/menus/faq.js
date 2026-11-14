const { getFAQs } = require("../../modules/faq/service");
const { isAdmin } = require("../../modules/auth/service");
const {
  sendMessage,
  editMessageText,
} = require("../../modules/telegram/service");

async function showFAQList(chatId, messageId, page = 1, user) {
  let result = await getFAQs(page, 8);

  const safePage = Math.max(
    1,
    Math.min(Number(page) || 1, Math.max(1, result.totalPages)),
  );

  if (safePage !== result.page) {
    result = await getFAQs(safePage, 8);
  }

  const currentPage = result.page;
  const isOwner = await isAdmin(user);

  const keyboard = result.faqs.map((faq) => [
    {
      text: faq.question.slice(0, 55),
      callback_data: `faq:view:${faq._id}:${currentPage}`,
    },
  ]);

  if (isOwner) {
    keyboard.push([
      {
        text: "➕ Add FAQ",
        callback_data: "faq:add",
      },
    ]);
  } else {
    keyboard.push([
      {
        text: "❓ Ask a Question",
        callback_data: "question:ask",
      },
    ]);
  }

  const navigation = [];

  if (currentPage > 1) {
    navigation.push({
      text: "‹ Previous",
      callback_data: `faq:page:${currentPage - 1}`,
    });
  }

  if (currentPage < result.totalPages) {
    navigation.push({
      text: "Next ›",
      callback_data: `faq:page:${currentPage + 1}`,
    });
  }

  if (navigation.length) {
    keyboard.push(navigation);
  }

  keyboard.push([
    {
      text: "⌂ Main Menu",
      callback_data: "main:menu",
    },
  ]);

  const text = result.total
    ? `Frequently Asked Questions\nPage ${currentPage} of ${result.totalPages}`
    : "There are no FAQs available yet.";

  const options = {
    reply_markup: { inline_keyboard: keyboard },
  };

  if (messageId) {
    return editMessageText(chatId, messageId, text, options);
  }

  return sendMessage(chatId, text, options);
}

module.exports = { showFAQList };
