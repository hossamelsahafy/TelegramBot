const {
  authenticateTelegramUser,
  isAdmin,
  isUserAuthenticated,
  getBotSettings,
} = require("../../modules/auth/service");

const { sendMessage } = require("../../modules/telegram/service");

const {
  setConversationState,
  clearConversation,
} = require("../utils/conversation");

const startCommand = require("../commands/start");

const handleFAQCallback = require("../callbacks/faq");
const handleFAQConversation = require("../conversations/faq");
const handleFAQCommand = require("../commands/faq");
const handleAuthConversation = require("../conversations/auth");

async function handleTelegramUpdate(update) {
  if (update?.callback_query) {
    await handleFAQCallback(update.callback_query);
    return;
  }

  const message = update?.message;

  if (!message?.from || !message?.chat) {
    return;
  }

  if (message.chat.type !== "private") {
    return;
  }

  const chatId = message.chat.id;
  const user = await authenticateTelegramUser(message.from);

  if (user.isBlocked) {
    await sendMessage(chatId, "Your account is blocked.");
    return;
  }

  const text = message.text?.trim();

  if (!text) {
    return;
  }

  const command = text.split(/\s+/)[0].split("@")[0];

  // START
  if (command === "/start") {
    await startCommand(chatId, user);
    return;
  }

  // HELP
  if (command === "/help") {
    await sendMessage(
      chatId,
      "Available commands:\n/start - Start the bot\n/help - Show help\n/cancel - Cancel current operation",
    );
    return;
  }

  // CANCEL
  if (command === "/cancel") {
    await clearConversation(user);
    await sendMessage(chatId, "Operation cancelled.");
    return;
  }

  // HANDLE ACTIVE CONVERSATIONS FIRST
  if (user.conversationState) {
    if (await handleFAQConversation(user, chatId, text)) {
      return;
    }

    if (await handleAuthConversation(user, chatId, text, message.message_id)) {
      return;
    }
  }

  // FAQ ADMIN COMMANDS
  if (await handleFAQCommand(user, chatId, text, command)) {
    return;
  }

  const settings = await getBotSettings();

  // OWNER SETUP
  if (command === "/setup") {
    if (settings.setupCompleted) {
      await sendMessage(chatId, "The bot has already been configured.");
      return;
    }

    await setConversationState(user, "awaiting_owner_secret");

    await sendMessage(
      chatId,
      "Owner setup started.\n\nSend your OWNER_SETUP_SECRET.",
    );
    return;
  }

  // SET INITIAL PASSWORD
  if (command === "/setpassword") {
    if (!(await isAdmin(user))) {
      await sendMessage(chatId, "Access denied.");
      return;
    }

    if (settings.passwordHash) {
      await sendMessage(
        chatId,
        "A shared password already exists. Use /changepassword instead.",
      );
      return;
    }

    await setConversationState(user, "awaiting_initial_password");

    await sendMessage(
      chatId,
      "Send the new shared password. Minimum 8 characters.",
    );
    return;
  }

  // CHANGE PASSWORD
  if (command === "/changepassword") {
    if (!(await isAdmin(user))) {
      await sendMessage(chatId, "Access denied.");
      return;
    }

    if (!settings.passwordHash) {
      await sendMessage(chatId, "No password exists yet. Use /setpassword.");
      return;
    }

    await setConversationState(user, "awaiting_new_password");

    await sendMessage(
      chatId,
      "Send the new shared password. Minimum 8 characters.",
    );
    return;
  }

  // REQUIRE AUTHENTICATION
  if (!(await isUserAuthenticated(user))) {
    if (!settings.passwordHash) {
      await sendMessage(
        chatId,
        "The bot is not ready yet. Please contact the owner.",
      );
      return;
    }

    await setConversationState(user, "awaiting_shared_password");

    await sendMessage(
      chatId,
      "Please send the shared password first. Use /start to begin.",
    );
    return;
  }

  // AUTHENTICATED USER COMMANDS
  await sendMessage(
    chatId,
    "Unknown command. Send /help to see available commands.",
  );
}

module.exports = handleTelegramUpdate;
