const { botToken } = require("../../config/env");

async function telegramRequest(method, payload) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || "Telegram API request failed");
  }

  return data.result;
}

async function sendMessage(chatId, text) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
  });
}
async function deleteMessage(chatId, messageId) {
  return telegramRequest("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

module.exports = {
  telegramRequest,
  sendMessage,
  deleteMessage,
};
