const { isAdmin, isUserAuthenticated } = require("../../modules/auth/service");

const {
  sendMessage,
  editMessageText,
} = require("../../modules/telegram/service");

async function showMainMenu(chatId, messageId, user) {
  user.conversationState = null;
  user.conversationData = null;
  await user.save();

  const isOwner = await isAdmin(user);

  let text;
  let keyboard;

  if (isOwner) {
    text =
      "Welcome, owner!\n\n" +
      "Password Management:\n" +
      "/setpassword\n" +
      "/changepassword\n\n" +
      "FAQ Management:\n" +
      "Manage your FAQs using the buttons below.\n\n" +
      "User Management:\n" +
      "Manage blocked users using the button below.";

    keyboard = [
      [
        {
          text: "📚 Manage FAQs",
          callback_data: "faq:page:1",
        },
      ],
      [
        {
          text: "🚫 Blocked Users",
          callback_data: "blocked:page:1",
        },
      ],
    ];
  } else {
    if (!(await isUserAuthenticated(user))) {
      text = "Please authenticate first using /start.";
      keyboard = [];
    } else {
      text = `Welcome back ${user.firstName}!\nYou are authenticated.`;
      keyboard = [
        [
          {
            text: "📚 Show FAQs",
            callback_data: "faq:page:1",
          },
        ],
      ];
    }
  }

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };

  if (messageId) {
    return editMessageText(chatId, messageId, text, options);
  }

  return sendMessage(chatId, text, options);
}

module.exports = { showMainMenu };
