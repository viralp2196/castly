import type { PrismaClient, UsageKind } from "@prisma/client";
import { tooMany } from "./errors";

export function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function usedToday(prisma: PrismaClient, userId: string, kind: UsageKind) {
  return prisma.usageEvent.count({ where: { userId, kind, createdAt: { gte: startOfUtcDay() } } });
}

/** Records one script or voice call, refusing once today's cap is reached. */
export async function consumeQuota(prisma: PrismaClient, userId: string, kind: UsageKind, limit: number) {
  const used = await usedToday(prisma, userId, kind);
  if (used >= limit) {
    const what = kind === "script" ? "script drafts" : "voice previews";
    throw tooMany(`You've used today's ${limit} ${what}. They reset at midnight UTC.`);
  }
  await prisma.usageEvent.create({ data: { userId, kind } });
}
