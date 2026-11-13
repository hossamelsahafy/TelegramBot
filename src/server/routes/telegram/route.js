const express = require("express");
const { timingSafeEqual } = require("node:crypto");

const connectDatabase = require("../../../database/database");
const handleTelegramUpdate = require("../../../bot/handlers/message");
const { webhookSecret } = require("../../../config/env");

const router = express.Router();

function isValidSecret(receivedSecret) {
  if (typeof receivedSecret !== "string") {
    return false;
  }

  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(webhookSecret);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

router.post("/webhook", async (req, res) => {
  const receivedSecret = req.get("X-Telegram-Bot-Api-Secret-Token");

  if (!isValidSecret(receivedSecret)) {
    return res.sendStatus(401);
  }

  try {
    await connectDatabase();

    await handleTelegramUpdate(req.body);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);

    return res.status(500).json({
      ok: false,
      message: "Failed to process update",
    });
  }
});

module.exports = router;
