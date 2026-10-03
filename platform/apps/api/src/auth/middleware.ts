import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import type { Config } from "../config";
import type { Deps } from "../deps";
import { forbidden, unauthorized } from "../errors";
import { SESSION_COOKIE, findSession } from "./session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

/** Attaches the signed-in user (if any) from the session cookie. */
export function loadUser({ prisma }: Pick<Deps, "prisma">): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string" && token.length >= 20 && token.length <= 100) {
      const session = await findSession(prisma, token);
      if (session) {
        req.user = session.user;
        req.sessionId = session.id;
      }
    }
    next();
  };
}

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};

/** The signed-in user; only call after requireUser. */
export function currentUser(req: { user?: User }) {
  if (!req.user) throw unauthorized();
  return req.user;
}

/**
 * Cookie sessions are SameSite=Lax; this also rejects state-changing requests
 * from browser origins we don't serve, as a second CSRF layer.
 */
export function originGuard(config: Config): RequestHandler {
  const allowed = new Set(config.webOrigins);
  return (req, _res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    const origin = req.get("origin");
    if (origin && !allowed.has(origin.replace(/\/$/, ""))) throw forbidden("Requests from that site aren't allowed.");
    next();
  };
}
