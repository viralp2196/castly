import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Config } from "./config";
import type { Mailer } from "./mailer";
import type { Storage } from "./storage";
import type { Xai } from "./xai";

/** Everything a route needs, passed in so tests can swap xAI, storage and mail. */
export type Deps = {
  config: Config;
  prisma: PrismaClient;
  storage: Storage;
  xai: Xai;
  mailer: Mailer;
  logger: Logger;
};
