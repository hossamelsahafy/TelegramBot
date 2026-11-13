const { Bot } = require("node-telegram-bot-api");
const { botToken } = require("../config/env");

function createBot() {
  return new Bot(botToken);
}

module.exports = createBot;
