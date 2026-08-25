import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { requestContext } from "../middlewares/request-logger.js";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development"
    ? [{ emit: "event", level: "query" }, { emit: "stdout", level: "error" }]
    : [{ emit: "stdout", level: "error" }]
});

if (env.NODE_ENV === "development") {
  prisma.$on("query", (event) => {
    const query = event.query.replace(/\s+/g, " ").trim();
    console.debug(JSON.stringify({
      event: "db.query",
      requestId: requestContext.getStore()?.requestId,
      durationMs: event.duration,
      query: query.length > 240 ? `${query.slice(0, 240)}…` : query
    }));
  });
}
