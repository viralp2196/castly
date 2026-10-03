import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { createApp } from "./app";
import { loadConfig } from "./config";
import type { Deps } from "./deps";
import { createMailer } from "./mailer";
import { createStorage } from "./storage";
import { startVideoPoller } from "./videos/service";
import { createXai } from "./xai";

const config = loadConfig();
const logger = pino({
  level: config.env === "production" ? "info" : "debug",
  transport: config.env === "development" ? { target: "pino/file", options: { destination: 1 } } : undefined,
});
const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl });

const deps: Deps = {
  config,
  prisma,
  logger,
  storage: createStorage(config),
  xai: createXai({ apiKey: config.xaiApiKey }),
  mailer: createMailer(config, logger),
};

const app = createApp(deps);
const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, ai: deps.xai.configured, storage: config.storage.driver },
    `Castly API listening on http://localhost:${config.port}`,
  );
  if (!deps.xai.configured) logger.warn("XAI_API_KEY is not set: script, voice and video endpoints will answer 503.");
});
const stopPoller = startVideoPoller(deps);

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  stopPoller();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
