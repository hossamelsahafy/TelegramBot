const {
  authenticateTelegramUser,
  isAdmin,
  isUserAuthenticated,
} = require("../../modules/auth/service");

const { getFAQById, deleteFAQ } = require("../../modules/faq/service");

const {
  editMessageText,
  answerCallbackQuery,
} = require("../../modules/telegram/service");

const { showFAQList } = require("../menus/faq");
const { showMainMenu } = require("../menus/main");

const {
  saveConversation,
  clearConversation,
} = require("../utils/conversation");

const { safeEditMessage, getInputKeyboard } = require("../utils/telegram");

async function handleFAQCallback(callbackQuery) {
  const callbackData = callbackQuery.data || "";
  const message = callbackQuery.message;

  if (!message?.chat || message.chat.type !== "private") {
    await answerCallbackQuery(callbackQuery.id, "Private chat only.", true);
    return;
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const user = await authenticateTelegramUser(callbackQuery.from);

  if (user.isBlocked) {
    await answerCallbackQuery(
      callbackQuery.id,
      "Your account is blocked.",
      true,
    );
    return;
  }

  await answerCallbackQuery(callbackQuery.id);

  const parts = callbackData.split(":");
  const action = parts[0];
  const operation = parts[1];

  if (callbackData === "main:menu" || callbackData === "nav:cancel") {
    await showMainMenu(chatId, messageId, user);
    return;
  }

  // FAQ LIST / PAGINATION
  if (action === "faq" && operation === "page") {
    if (!(await isAdmin(user)) && !(await isUserAuthenticated(user))) {
      await editMessageText(
        chatId,
        messageId,
        "Please authenticate first using /start.",
      );
      return;
    }

    const page = Math.max(1, Number(parts[2]) || 1);
    await showFAQList(chatId, messageId, page, user);
    return;
  }

  // VIEW FAQ
  if (action === "faq" && operation === "view") {
    if (!(await isAdmin(user)) && !(await isUserAuthenticated(user))) {
      await answerCallbackQuery(
        callbackQuery.id,
        "Please authenticate first.",
        true,
      );
      return;
    }

    const faqId = parts[2];
    const page = Math.max(1, Number(parts[3]) || 1);
    const faq = await getFAQById(faqId);

    if (!faq) {
      await editMessageText(chatId, messageId, "FAQ not found.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "‹ Back to FAQs", callback_data: `faq:page:${page}` }],
            [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
          ],
        },
      });
      return;
    }

    await editMessageText(
      chatId,
      messageId,
      `Question:\n${faq.question}\n\nAnswer:\n${faq.answer}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "‹ Back to FAQs", callback_data: `faq:page:${page}` }],
            [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
          ],
        },
      },
    );
    return;
  }

  // ADMIN-ONLY ACTIONS
  const adminOnlyCallbacks = [
    "admin",
    "add",
    "edit",
    "delete",
    "confirm_delete",
    "back",
  ];

  if (action === "faq" && adminOnlyCallbacks.includes(operation)) {
    if (!(await isAdmin(user))) {
      await editMessageText(chatId, messageId, "Access denied.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
          ],
        },
      });
      return;
    }
  }

  // BACK TO ADD QUESTION
  if (callbackData === "faq:back:add_question") {
    const question = user.conversationData?.question || "";

    await saveConversation(user, "awaiting_faq_question", {
      question,
    });

    await safeEditMessage(
      chatId,
      messageId,
      question
        ? `Current question:\n${question}\n\nSend the question again to replace it.`
        : "Send the FAQ question.",
      getInputKeyboard({
        backCallback: "faq:page:1",
      }),
    );

    return;
  }

  // BACK TO EDIT QUESTION
  if (callbackData === "faq:back:edit_question") {
    const data = user.conversationData;

    if (!data?.faqId) {
      await clearConversation(user);
      await showFAQList(chatId, messageId, 1, user);
      return;
    }

    await saveConversation(user, "awaiting_faq_edit_question", data);

    await safeEditMessage(
      chatId,
      messageId,
      `Current question:\n${data.updatedQuestion || data.originalQuestion}\n\nSend the new question, or /skip to keep it.`,
      getInputKeyboard({
        backCallback: `faq:admin:${data.faqId}:${data.page || 1}`,
      }),
    );

    return;
  }

  // ADD FAQ
  if (callbackData === "faq:add") {
    await saveConversation(user, "awaiting_faq_question");

    await editMessageText(chatId, messageId, "Send the FAQ question.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Cancel", callback_data: "nav:cancel" }],
          [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
        ],
      },
    });
    return;
  }

  // ADMIN FAQ OPTIONS
  if (action === "faq" && operation === "admin") {
    const faqId = parts[2];
    const page = Math.max(1, Number(parts[3]) || 1);
    const faq = await getFAQById(faqId);

    if (!faq) {
      await showFAQList(chatId, messageId, page, user);
      return;
    }

    await editMessageText(chatId, messageId, `Manage FAQ:\n\n${faq.question}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✏️ Edit", callback_data: `faq:edit:${faqId}:${page}` },
            { text: "🗑 Delete", callback_data: `faq:delete:${faqId}:${page}` },
          ],
          [{ text: "‹ Back to FAQs", callback_data: `faq:page:${page}` }],
          [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
        ],
      },
    });
    return;
  }

  // EDIT FAQ
  if (action === "faq" && operation === "edit") {
    const faqId = parts[2];
    const page = Math.max(1, Number(parts[3]) || 1);
    const faq = await getFAQById(faqId);

    if (!faq) {
      await showFAQList(chatId, messageId, page, user);
      return;
    }

    await saveConversation(user, "awaiting_faq_edit_question", {
      faqId: faq._id.toString(),
      originalQuestion: faq.question,
      originalAnswer: faq.answer,
      page,
    });

    await editMessageText(
      chatId,
      messageId,
      `Current question:\n${faq.question}\n\nSend the new question, or /skip to keep it.`,
      getInputKeyboard({
        backCallback: `faq:admin:${faqId}:${page}`,
      }),
    );
    return;
  }

  // DELETE CONFIRMATION
  if (action === "faq" && operation === "delete") {
    const faqId = parts[2];
    const page = Math.max(1, Number(parts[3]) || 1);
    const faq = await getFAQById(faqId);

    if (!faq) {
      await showFAQList(chatId, messageId, page, user);
      return;
    }

    await editMessageText(
      chatId,
      messageId,
      `Are you sure you want to delete this FAQ?\n\n${faq.question}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Yes, delete",
                callback_data: `faq:confirm_delete:${faqId}:${page}`,
              },
              {
                text: "Cancel",
                callback_data: `faq:admin:${faqId}:${page}`,
              },
            ],
            [{ text: "⌂ Main Menu", callback_data: "main:menu" }],
          ],
        },
      },
    );
    return;
  }

  // CONFIRM DELETE
  if (action === "faq" && operation === "confirm_delete") {
    const faqId = parts[2];
    const page = Math.max(1, Number(parts[3]) || 1);
    const deletedFAQ = await deleteFAQ(faqId);

    if (!deletedFAQ) {
      await editMessageText(chatId, messageId, "FAQ not found.");
      return;
    }

    await showFAQList(chatId, messageId, page, user);
  }
}

module.exports = handleFAQCallback;
