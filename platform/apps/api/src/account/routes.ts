import { changePasswordSchema, profileSchema, type CreditsOverview } from "@castly/shared";
import { Router } from "express";
import { currentUser, requireUser } from "../auth/middleware";
import { hashPassword, verifyPassword } from "../auth/password";
import type { Deps } from "../deps";
import { badRequest, parse } from "../errors";
import { toCreditEntry, toUser } from "../serialize";
import { usedToday } from "../usage";

export function accountRouter({ prisma, config }: Deps) {
  const router = Router();
  router.use(requireUser);

  router.patch("/", async (req, res) => {
    const input = parse(profileSchema, req.body);
    const user = await prisma.user.update({ where: { id: currentUser(req).id }, data: { name: input.name } });
    res.json({ user: toUser(user) });
  });

  router.post("/password", async (req, res) => {
    const input = parse(changePasswordSchema, req.body);
    const user = currentUser(req);
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw badRequest("Your current password isn't right.", { currentPassword: "That isn't your current password." });
    }
    const passwordHash = await hashPassword(input.newPassword, config.bcryptRounds);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Sign out every other device; keep this one.
      prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: req.sessionId } } }),
    ]);
    res.status(204).end();
  });

  return router;
}

export function creditsRouter({ prisma, config }: Deps) {
  const router = Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const userId = currentUser(req).id;
    const [user, entries, scripts, voices] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.creditEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      usedToday(prisma, userId, "script"),
      usedToday(prisma, userId, "voice"),
    ]);
    const body: CreditsOverview = {
      balance: user.credits,
      entries: entries.map(toCreditEntry),
      usage: {
        scripts: { used: scripts, limit: config.dailyScriptLimit },
        voices: { used: voices, limit: config.dailyVoiceLimit },
      },
    };
    res.json(body);
  });

  return router;
}
