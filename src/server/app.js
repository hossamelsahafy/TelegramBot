const express = require("express");

const telegramRoutes = require("./routes/telegram/route");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Telegram Bot API is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
  });
});

app.use("/api/telegram", telegramRoutes);

module.exports = app;
