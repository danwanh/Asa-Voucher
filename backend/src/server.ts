import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Asa Voucher API listening on port ${env.PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use. Stop the existing server or change PORT in .env.`);
  } else {
    console.error("Unable to start the API server.", error);
  }
  process.exit(1);
});
