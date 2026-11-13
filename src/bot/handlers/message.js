const {
  authenticateTelegramUser,
  setupOwner,
  isAdmin,
  isUserAuthenticated,
  authenticateUser,
  saveSharedPassword,
  getBotSettings,
} = require("../../modules/auth/service");

const {
  sendMessage,
  deleteMessage,
} = require("../../modules/telegram/service");

const startCommand = require("../commands/start");

async function removeSensitiveMessage(chatId, messageId) {
  try {
    await deleteMessage(chatId, messageId);
  } catch (error) {
    console.error("Could not delete sensitive message:", error.message);
  }
}

async function setConversationState(user, state) {
  user.conversationState = state;
  await user.save();
}

async function handleTelegramUpdate(update) {
  const message = update?.message;

  if (!message?.from || !message?.chat) {
    return;
  }

  // Only handle private chats.
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
      "Available commands:\n/start - Start the bot\n/help - Show help",
    );
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

  // CONVERSATION STATES
  switch (user.conversationState) {
    case "awaiting_owner_secret": {
      await removeSensitiveMessage(chatId, message.message_id);

      const result = await setupOwner(user, text);

      if (!result.success) {
        user.conversationState = null;
        await user.save();

        await sendMessage(
          chatId,
          result.reason === "ALREADY_CONFIGURED"
            ? "Owner setup has already been completed."
            : "Invalid setup secret. Please try again with /setup.",
        );
        return;
      }

      user.conversationState = "awaiting_initial_password";
      await user.save();

      await sendMessage(
        chatId,
        "Owner setup completed successfully!\n\nNow send your shared password.",
      );
      return;
    }

    case "awaiting_initial_password":
    case "awaiting_new_password": {
      if (!(await isAdmin(user))) {
        user.conversationState = null;
        await user.save();

        await sendMessage(chatId, "Access denied.");
        return;
      }

      await removeSensitiveMessage(chatId, message.message_id);

      if (text.length < 8 || text.length > 128) {
        await sendMessage(
          chatId,
          "Password must be between 8 and 128 characters. Please try again.",
        );
        return;
      }

      const previousState = user.conversationState;

      await saveSharedPassword(user, text);

      user.conversationState = null;
      await user.save();

      await sendMessage(
        chatId,
        previousState === "awaiting_initial_password"
          ? "Shared password created successfully!"
          : "Shared password changed successfully. All users must log in again.",
      );
      return;
    }

    case "awaiting_shared_password": {
      await removeSensitiveMessage(chatId, message.message_id);

      const result = await authenticateUser(user, text);

      if (!result.success) {
        await sendMessage(
          chatId,
          result.reason === "PASSWORD_NOT_SET"
            ? "The shared password has not been configured yet."
            : "Incorrect password. Please try again.",
        );
        return;
      }

      user.conversationState = null;
      await user.save();

      await sendMessage(
        chatId,
        `Welcome ${user.firstName}!\nYou are now authenticated.`,
      );
      return;
    }

    default:
      break;
  }

  // REQUIRE AUTHENTICATION
  if (!(await isUserAuthenticated(user))) {
    const currentSettings = await getBotSettings();

    if (!currentSettings.passwordHash) {
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
  await sendMessage(chatId, "HELLO YA BDANY");
}

module.exports = handleTelegramUpdate;
