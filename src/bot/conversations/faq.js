const { isAdmin } = require("../../modules/auth/service");

const { createFAQ, updateFAQ } = require("../../modules/faq/service");

const { sendMessage } = require("../../modules/telegram/service");

const { clearConversation } = require("../utils/conversation");

async function handleFAQConversation(user, chatId, text) {
  switch (user.conversationState) {
    case "awaiting_faq_question": {
      if (!(await isAdmin(user))) {
        await clearConversation(user);
        await sendMessage(chatId, "Access denied.");
        return true;
      }

      if (text.length > 500) {
        await sendMessage(
          chatId,
          "Question is too long. Maximum length is 500 characters.",
        );
        return true;
      }

      user.conversationData = { question: text };
      user.conversationState = "awaiting_faq_answer";
      await user.save();

      await sendMessage(chatId, "Now send the answer.");
      return true;
    }

    case "awaiting_faq_answer": {
      if (!(await isAdmin(user))) {
        await clearConversation(user);
        await sendMessage(chatId, "Access denied.");
        return true;
      }

      if (text.length > 4000) {
        await sendMessage(
          chatId,
          "Answer is too long. Maximum length is 4000 characters.",
        );
        return true;
      }

      if (!user.conversationData?.question) {
        await clearConversation(user);
        await sendMessage(
          chatId,
          "Something went wrong. Please start again with /addqa.",
        );
        return true;
      }

      await createFAQ(user.conversationData.question, text, user.telegramId);

      await clearConversation(user);
      await sendMessage(chatId, "FAQ added successfully!");
      return true;
    }

    case "awaiting_faq_edit_question": {
      if (!(await isAdmin(user))) {
        await clearConversation(user);
        await sendMessage(chatId, "Access denied.");
        return true;
      }

      const data = user.conversationData;

      if (!data?.faqId) {
        await clearConversation(user);
        await sendMessage(chatId, "Something went wrong. Please start again.");
        return true;
      }

      if (text !== "/skip") {
        if (!text.trim() || text.length > 500) {
          await sendMessage(
            chatId,
            "Question must be between 1 and 500 characters.",
          );
          return true;
        }

        data.updatedQuestion = text.trim();
      }

      user.conversationState = "awaiting_faq_edit_answer";
      user.conversationData = data;
      await user.save();

      await sendMessage(
        chatId,
        `Current answer:\n${data.originalAnswer}\n\nSend the new answer, or /skip to keep it.`,
      );

      return true;
    }

    case "awaiting_faq_edit_answer": {
      if (!(await isAdmin(user))) {
        await clearConversation(user);
        await sendMessage(chatId, "Access denied.");
        return true;
      }

      const data = user.conversationData;

      if (!data?.faqId) {
        await clearConversation(user);
        await sendMessage(chatId, "Something went wrong. Please start again.");
        return true;
      }

      if (text !== "/skip") {
        if (!text.trim() || text.length > 4000) {
          await sendMessage(
            chatId,
            "Answer must be between 1 and 4000 characters.",
          );
          return true;
        }

        data.updatedAnswer = text.trim();
      }

      const updatedFAQ = await updateFAQ(data.faqId, {
        question: data.updatedQuestion || data.originalQuestion,
        answer: data.updatedAnswer || data.originalAnswer,
      });

      if (!updatedFAQ) {
        await clearConversation(user);
        await sendMessage(chatId, "FAQ not found. Please try again.");
        return true;
      }

      await clearConversation(user);
      await sendMessage(chatId, "FAQ updated successfully!");

      return true;
    }

    default:
      return false;
  }
}

module.exports = handleFAQConversation;
