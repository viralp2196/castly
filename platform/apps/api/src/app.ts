import { existsSync } from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { accountRouter, creditsRouter } from "./account/routes";
import { loadUser, originGuard } from "./auth/middleware";
import { authRouter } from "./auth/routes";
import type { Deps } from "./deps";
import { errorHandler, notFound } from "./errors";
import { mediaRouter } from "./media/routes";
import { projectsRouter } from "./projects/routes";
import { videosRouter } from "./videos/routes";

export function createApp(deps: Deps) {
  const { config, logger } = deps;
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:", "data:", "https:"],
          connectSrc: ["'self'"],
          // Only force https sub-resources when the site itself runs on https.
          upgradeInsecureRequests: config.cookieSecure ? [] : null,
        },
      },
    }),
  );
  if (config.env !== "test") app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  app.use(cors({ origin: config.webOrigins, credentials: true }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(originGuard(config));
  app.use(loadUser(deps));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ai: deps.xai.configured });
  });
  app.use("/api/auth", authRouter(deps));
  app.use("/api/account", accountRouter(deps));
  app.use("/api/credits", creditsRouter(deps));
  app.use("/api/projects", projectsRouter(deps));
  app.use("/api/videos", videosRouter(deps));
  app.use("/api/media", mediaRouter(deps));
  app.use("/api", () => {
    throw notFound("No such endpoint.");
  });

  // Production option: serve the built React app from the same origin as the API.
  if (config.serveWebDist) {
    const dist = path.resolve(config.serveWebDist);
    const index = path.join(dist, "index.html");
    if (!existsSync(index)) throw new Error(`SERVE_WEB_DIST has no index.html: ${dist}`);
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) return next();
      res.sendFile(index);
    });
  }

  app.use(errorHandler(logger));
  return app;
}
