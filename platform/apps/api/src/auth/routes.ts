import { Prisma } from "@prisma/client";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@castly/shared";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { Deps } from "../deps";
import { badRequest, conflict, parse, tooMany, unauthorized } from "../errors";
import { toUser } from "../serialize";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, createSession, hashToken, randomToken, setSessionCookie } from "./session";

const RESET_TTL_MS = 60 * 60_000;

export function authRouter(deps: Deps) {
  const { prisma, config, mailer, logger } = deps;
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.rateLimitAuth,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooMany("Too many attempts. Try again in a few minutes.")),
  });

  router.post("/register", limiter, async (req, res) => {
    const input = parse(registerSchema, req.body);
    const passwordHash = await hashPassword(input.password, config.bcryptRounds);
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: input.email, name: input.name, passwordHash, credits: config.freeCredits },
        });
        if (config.freeCredits > 0) {
          await tx.creditEntry.create({
            data: { userId: created.id, delta: config.freeCredits, reason: "signup_grant", note: "Welcome credits" },
          });
        }
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw conflict("That email already has an account. Sign in instead.", {
          email: "That email already has an account.",
        });
      }
      throw err;
    }
    const session = await createSession(prisma, config, user.id, req.get("user-agent"));
    setSessionCookie(res, config, session.token, session.expiresAt);
    res.status(201).json({ user: toUser(user) });
  });

  router.post("/login", limiter, async (req, res) => {
    const input = parse(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      await burnPasswordCheck(input.password, config.bcryptRounds);
      throw unauthorized("That email and password don't match.");
    }
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized("That email and password don't match.");
    }
    const session = await createSession(prisma, config, user.id, req.get("user-agent"));
    setSessionCookie(res, config, session.token, session.expiresAt);
    res.json({ user: toUser(user) });
  });

  router.post("/logout", async (req, res) => {
    if (req.sessionId) await prisma.session.deleteMany({ where: { id: req.sessionId } });
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  // Signed-out visitors get `user: null` (not a 401) so every public page load isn't a console error.
  router.get("/me", (req, res) => {
    res.json({ user: req.user ? toUser(req.user) : null });
  });

  router.post("/forgot", limiter, async (req, res) => {
    const input = parse(forgotSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
      const token = randomToken();
      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      const link = `${config.publicWebUrl}/reset/${token}`;
      try {
        await mailer.send({
          to: user.email,
          subject: "Reset your Castly password",
          text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in an hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
        });
      } catch (err) {
        logger.error({ err }, "password reset email failed");
      }
    }
    // Same answer either way, so the form can't be used to test which emails have accounts.
    res.status(204).end();
  });

  router.post("/reset", limiter, async (req, res) => {
    const input = parse(resetSchema, req.body);
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(input.token) } });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      throw badRequest("This reset link is invalid or has expired. Ask for a new one.");
    }
    const passwordHash = await hashPassword(input.password, config.bcryptRounds);
    const user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw badRequest("This reset link was already used.");
      await tx.session.deleteMany({ where: { userId: reset.userId } });
      return tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    });
    const session = await createSession(prisma, config, user.id, req.get("user-agent"));
    setSessionCookie(res, config, session.token, session.expiresAt);
    res.json({ user: toUser(user) });
  });

  return router;
}
