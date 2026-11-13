require("dotenv").config();

const PORT = process.env.PORT || 3000;
const app = require("./server/app");

async function start() {
  try {
    app.listen(PORT, () => {
      console.log(`Server Listening On Port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup Error:", error);
    process.exit(1);
  }
}

start();
