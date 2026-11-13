require("dotenv").config();

const required = [
  "BOT_TOKEN",
  "MONGODB_URI",
  "TELEGRAM_WEBHOOK_SECRET",
  "OWNER_SETUP_SECRET",
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

module.exports = {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGODB_URI,
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  ownerSetupSecret: process.env.OWNER_SETUP_SECRET,
};
