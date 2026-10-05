import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";
import { loadConfig } from "./config";
import type { Deps } from "./deps";
import { createLogger } from "./logger";
import { createMailer } from "./mailer";
import { createStorage } from "./storage";
import { createLtx, xaiVideo } from "./video-gen";
import { startVideoPoller } from "./videos/service";
import { createXai } from "./xai";

const config = loadConfig();
const logger = createLogger(config);
const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl });

const xai = createXai({ apiKey: config.xaiApiKey });
const deps: Deps = {
  config,
  prisma,
  logger,
  storage: createStorage(config),
  xai,
  video: config.ltxApiUrl
    ? createLtx({
        baseUrl: config.ltxApiUrl,
        duration: config.ltxDuration,
        steps: config.ltxSteps,
        enhance: config.ltxEnhance,
      })
    : xaiVideo(xai),
  mailer: createMailer(config, logger),
};

const app = createApp(deps);
const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, ai: deps.xai.configured, video: deps.video.name, storage: config.storage.driver },
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
