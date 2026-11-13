const mongoose = require("mongoose");
const { mongoUri } = require("../config/env");

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;

  return mongoose.connection;
}

module.exports = connectDatabase;
