const { submitQuestion } = require("../../modules/question/service");
const { sendMessage } = require("../../modules/telegram/service");

const { clearConversation } = require("../utils/conversation");

async function handleQuestionConversation(user, chatId, text) {
  if (user.conversationState !== "awaiting_user_question") {
    return false;
  }

  if (!text || !text.trim()) {
    await sendMessage(chatId, "Please send a valid question.");
    return true;
  }

  try {
    await submitQuestion(user, text);

    await clearConversation(user);

    await sendMessage(
      chatId,
      "Your question has been sent successfully!\n\nThe owner has received your question.",
    );
  } catch (error) {
    console.error("Submit Question Error:", error);

    await sendMessage(
      chatId,
      "Sorry, something went wrong while sending your question. Please try again later.",
    );
  }

  return true;
}

module.exports = handleQuestionConversation;
