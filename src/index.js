const express = require("express");
const app = require("./server/app");

if (typeof app !== "function" || typeof app.listen !== "function") {
  throw new Error("Invalid Express application");
}

module.exports = app;
