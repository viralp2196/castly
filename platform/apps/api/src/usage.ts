import type { PrismaClient, UsageKind } from "@prisma/client";
import { tooMany } from "./errors";

export function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function usedToday(prisma: PrismaClient, userId: string, kind: UsageKind) {
  return prisma.usageEvent.count({ where: { userId, kind, createdAt: { gte: startOfUtcDay() } } });
}

/**
 * Records one script or voice call, refusing once today's cap is reached.
 * A per-user, per-kind advisory lock serialises the check and the insert, so
 * simultaneous requests can't all pass the count and overshoot the cap.
 */
export async function consumeQuota(prisma: PrismaClient, userId: string, kind: UsageKind, limit: number) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`usage:${userId}:${kind}`}))`;
    const used = await tx.usageEvent.count({ where: { userId, kind, createdAt: { gte: startOfUtcDay() } } });
    if (used >= limit) {
      const what = kind === "script" ? "script drafts" : "voice previews";
      throw tooMany(`You've used today's ${limit} ${what}. They reset at midnight UTC.`);
    }
    await tx.usageEvent.create({ data: { userId, kind } });
  });
}
