const bcrypt = require("bcryptjs");
const { timingSafeEqual } = require("node:crypto");

const User = require("../../database/models/user");
const BotSettings = require("../../database/models/BotSettings/model");

const { ownerSetupSecret } = require("../../config/env");

async function getBotSettings() {
  return BotSettings.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

function isValidSetupSecret(receivedSecret) {
  if (
    typeof receivedSecret !== "string" ||
    typeof ownerSetupSecret !== "string" ||
    !ownerSetupSecret
  ) {
    return false;
  }

  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(ownerSetupSecret);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

async function getOrCreateUser(telegramUser) {
  const telegramId = Number(telegramUser.id);

  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    throw new Error("Invalid Telegram user ID");
  }

  return User.findOneAndUpdate(
    { telegramId },
    {
      $set: {
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || "User",
        lastName: telegramUser.last_name || null,
      },
      $setOnInsert: {
        telegramId,
        role: "user",
        isAuthenticated: false,
        authenticatedPasswordVersion: 0,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );
}

async function setupOwner(user, receivedSecret) {
  if (!isValidSetupSecret(receivedSecret)) {
    return {
      success: false,
      reason: "INVALID_SECRET",
    };
  }

  await getBotSettings();

  const settings = await BotSettings.findOneAndUpdate(
    {
      key: "main",
      setupCompleted: false,
      ownerTelegramId: null,
    },
    {
      $set: {
        ownerTelegramId: user.telegramId,
        setupCompleted: true,
      },
    },
    {
      new: true,
    },
  );

  if (!settings) {
    return {
      success: false,
      reason: "ALREADY_CONFIGURED",
    };
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        role: "admin",
        isAuthenticated: true,
      },
    },
  );

  return { success: true };
}

async function isAdmin(user) {
  if (!user) {
    return false;
  }

  const settings = await getBotSettings();

  return (
    settings.setupCompleted === true &&
    Number(settings.ownerTelegramId) === Number(user.telegramId)
  );
}

async function isUserAuthenticated(user) {
  if (!user || user.isBlocked) {
    return false;
  }

  if (await isAdmin(user)) {
    return true;
  }

  if (!user.isAuthenticated) {
    return false;
  }

  const settings = await getBotSettings();

  return (
    Boolean(settings.passwordHash) &&
    user.authenticatedPasswordVersion === settings.passwordVersion
  );
}

async function saveSharedPassword(user, password) {
  if (!(await isAdmin(user))) {
    throw new Error("Only the owner can change the shared password");
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new Error("Password must be between 8 and 128 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const settings = await getBotSettings();

  settings.passwordHash = passwordHash;
  settings.passwordVersion += 1;

  await settings.save();

  return settings;
}

async function authenticateUser(user, password) {
  const MAX_ATTEMPTS = 5;

  if (!user || user.isBlocked) {
    return {
      success: false,
      reason: "USER_BLOCKED",
    };
  }

  const settings = await getBotSettings();

  if (!settings.passwordHash) {
    return {
      success: false,
      reason: "PASSWORD_NOT_SET",
    };
  }

  if (typeof password !== "string") {
    return {
      success: false,
      reason: "INVALID_PASSWORD",
    };
  }

  const valid = await bcrypt.compare(password, settings.passwordHash);

  if (!valid) {
    user.failedPasswordAttempts = (user.failedPasswordAttempts || 0) + 1;

    const remainingAttempts = MAX_ATTEMPTS - user.failedPasswordAttempts;

    if (remainingAttempts <= 0) {
      user.isBlocked = true;
      user.isAuthenticated = false;
      await user.save();

      return {
        success: false,
        reason: "USER_BLOCKED",
        blockedNow: true,
        remainingAttempts: 0,
        user: {
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    await user.save();

    return {
      success: false,
      reason: "INVALID_PASSWORD",
      remainingAttempts,
    };
  }

  user.isAuthenticated = true;
  user.authenticatedPasswordVersion = settings.passwordVersion;
  user.failedPasswordAttempts = 0;

  await user.save();

  return { success: true };
}

async function isPasswordConfigured() {
  const settings = await getBotSettings();

  return Boolean(settings.passwordHash);
}

async function authenticateTelegramUser(telegramUser) {
  return getOrCreateUser(telegramUser);
}

async function unblockUser(telegramId, admin) {
  if (!(await isAdmin(admin))) {
    throw new Error("Only the owner can unblock users");
  }

  const user = await User.findOneAndUpdate(
    {
      telegramId: Number(telegramId),
      isBlocked: true,
    },
    {
      $set: {
        isBlocked: false,
        failedPasswordAttempts: 0,
        isAuthenticated: false,
      },
    },
    { new: true },
  );

  return user;
}

async function getBlockedUsers(admin, page = 1, limit = 8) {
  if (!(await isAdmin(admin))) {
    throw new Error("Only the owner can view blocked users");
  }

  const safePage = Math.max(1, Number(page) || 1);

  const [users, total] = await Promise.all([
    User.find({ isBlocked: true })
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .select("telegramId username firstName lastName failedPasswordAttempts")
      .lean(),

    User.countDocuments({ isBlocked: true }),
  ]);

  return {
    users,
    total,
    page: safePage,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = {
  getBotSettings,
  getOrCreateUser,
  authenticateTelegramUser,
  setupOwner,
  isAdmin,
  isUserAuthenticated,
  saveSharedPassword,
  authenticateUser,
  isPasswordConfigured,
  unblockUser,
  getBlockedUsers,
};
