import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { apiRoutes } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);

  app.use("/api", apiRoutes);
  app.use(errorHandler);

  return app;
}
