const {
  sendMessage,
  deleteMessage,
  editMessageText,
} = require("../../modules/telegram/service");

async function removeSensitiveMessage(chatId, messageId) {
  try {
    await deleteMessage(chatId, messageId);
  } catch (error) {
    console.error("Could not delete sensitive message:", error.message);
  }
}

async function safeEditMessage(chatId, messageId, text, options = {}) {
  try {
    return await editMessageText(chatId, messageId, text, options);
  } catch (error) {
    if (error.message?.includes("message is not modified")) {
      return;
    }

    console.error("Could not edit Telegram message:", error.message);
    return sendMessage(chatId, text, options);
  }
}

function getInputKeyboard({ backCallback } = {}) {
  const keyboard = [];

  if (backCallback) {
    keyboard.push([
      {
        text: "‹ Back",
        callback_data: backCallback,
      },
    ]);
  }

  keyboard.push([
    {
      text: "Cancel",
      callback_data: "nav:cancel",
    },
  ]);

  keyboard.push([
    {
      text: "⌂ Main Menu",
      callback_data: "main:menu",
    },
  ]);

  return {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };
}

module.exports = {
  removeSensitiveMessage,
  safeEditMessage,
  getInputKeyboard,
};
