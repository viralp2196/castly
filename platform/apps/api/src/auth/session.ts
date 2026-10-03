import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { Response } from "express";
import type { Config } from "../config";

export const SESSION_COOKIE = "castly_session";

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(prisma: PrismaClient, config: Config, userId: string, userAgent?: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) },
  });
  return { token, expiresAt };
}

export function setSessionCookie(res: Response, config: Config, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response, config: Config) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: config.cookieSecure, path: "/" });
}

/** Returns the live session for a cookie token, deleting it if it has expired. */
export async function findSession(prisma: PrismaClient, token: string) {
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session;
}
