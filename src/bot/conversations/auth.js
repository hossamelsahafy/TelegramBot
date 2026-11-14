const {
  setupOwner,
  isAdmin,
  authenticateUser,
  saveSharedPassword,
  getBotSettings,
} = require("../../modules/auth/service");

const { sendMessage } = require("../../modules/telegram/service");

const { clearConversation } = require("../utils/conversation");

const { removeSensitiveMessage } = require("../utils/telegram");

async function handleAuthConversation(user, chatId, text, messageId) {
  switch (user.conversationState) {
    case "awaiting_owner_secret": {
      await removeSensitiveMessage(chatId, messageId);

      const result = await setupOwner(user, text);

      if (!result.success) {
        await clearConversation(user);

        await sendMessage(
          chatId,
          result.reason === "ALREADY_CONFIGURED"
            ? "Owner setup has already been completed."
            : "Invalid setup secret. Please try again with /setup.",
        );

        return true;
      }

      user.conversationState = "awaiting_initial_password";
      await user.save();

      await sendMessage(
        chatId,
        "Owner setup completed successfully!\n\nNow send your shared password.",
      );

      return true;
    }

    case "awaiting_initial_password":
    case "awaiting_new_password": {
      if (!(await isAdmin(user))) {
        await clearConversation(user);
        await sendMessage(chatId, "Access denied.");
        return true;
      }

      await removeSensitiveMessage(chatId, messageId);

      if (text.length < 8 || text.length > 128) {
        await sendMessage(
          chatId,
          "Password must be between 8 and 128 characters. Please try again.",
        );

        return true;
      }

      const previousState = user.conversationState;

      await saveSharedPassword(user, text);
      await clearConversation(user);

      await sendMessage(
        chatId,
        previousState === "awaiting_initial_password"
          ? "Shared password created successfully!"
          : "Shared password changed successfully. All users must log in again.",
      );

      return true;
    }

    case "awaiting_shared_password": {
      await removeSensitiveMessage(chatId, messageId);

      const result = await authenticateUser(user, text);

      if (!result.success) {
        let message;

        if (result.reason === "PASSWORD_NOT_SET") {
          message = "The shared password has not been configured yet.";
        } else if (result.reason === "USER_BLOCKED") {
          message =
            "Your account has been blocked after 5 incorrect password attempts. Contact the owner.";

          if (result.blockedNow) {
            const settings = await getBotSettings();

            if (settings.ownerTelegramId) {
              const fullName = [result.user.firstName, result.user.lastName]
                .filter(Boolean)
                .join(" ");

              const username = result.user.username
                ? `@${result.user.username}`
                : "No username";

              await sendMessage(
                settings.ownerTelegramId,
                `⚠️ User blocked after 5 incorrect password attempts.\n\nName: ${fullName}\nUsername: ${username}\nTelegram ID: ${result.user.telegramId}`,
              );
            }
          }
        } else {
          message = `Incorrect password. ${result.remainingAttempts} attempts remaining.`;
        }

        await sendMessage(chatId, message);
        return true;
      }

      await clearConversation(user);

      await sendMessage(
        chatId,
        `Welcome ${user.firstName}!\nYou are now authenticated.`,
      );

      return true;
    }

    default:
      return false;
  }
}

module.exports = handleAuthConversation;
