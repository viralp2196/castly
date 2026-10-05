import type { Project, Video } from "@prisma/client";
import { getAspect, getScene } from "@castly/shared";
import { creatorPortraitDataUrl, toDataUrl } from "../assets";
import type { Deps } from "../deps";
import { badRequest, HttpError, outOfCredits, tooMany, unavailable } from "../errors";
import { readScript } from "../serialize";
import { buildVideoPrompt } from "../xai";

const REFUND_NOTE = "Clip didn't finish";

/**
 * Charges one credit and starts a 6s clip. The debit and the job row commit together,
 * so two clicks with one credit left can never both start a clip.
 */
export async function startVideo(deps: Deps, userId: string, project: Project): Promise<Video> {
  const { prisma, video: gen, storage, config } = deps;
  const hook = readScript(project.script).hook.trim();
  if (hook.length < 8) throw badRequest("Write a hook before you generate a clip.");
  if (!gen.configured) throw unavailable("Video generation isn't configured on this server yet.");

  const pending = await prisma.video.count({ where: { userId, status: "pending" } });
  if (pending >= config.maxPendingVideos) {
    throw tooMany(`You already have ${pending} clip${pending === 1 ? "" : "s"} rendering. Wait for one to finish.`);
  }

  const portrait = await creatorPortraitDataUrl(project.creatorId);
  let productImage: string | undefined;
  if (project.format === "in-hand" && project.productImageKey) {
    const bytes = await storage.read(project.productImageKey);
    const ext = project.productImageKey.split(".").pop();
    if (bytes) productImage = toDataUrl(bytes, ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
  }
  const prompt = buildVideoPrompt({
    sceneDetail: getScene(project.sceneId).detail,
    hook,
    format: project.format,
    product: project.product,
    hasProductImage: Boolean(productImage),
    subjectRefs: gen.usesSubjectRefs,
  });

  const video = await prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: { id: userId, credits: { gte: 1 } },
      data: { credits: { decrement: 1 } },
    });
    if (debited.count !== 1) throw outOfCredits();
    const created = await tx.video.create({
      data: { userId, projectId: project.id, prompt, hook, aspect: project.aspect, creatorId: project.creatorId },
    });
    await tx.creditEntry.create({
      data: { userId, delta: -1, reason: "video_debit", videoId: created.id, note: project.title },
    });
    return created;
  });

  try {
    const requestId = await gen.start({
      key: video.id,
      prompt,
      portrait,
      productImage,
      aspectRatio: getAspect(project.aspect).xai,
    });
    return await prisma.video.update({ where: { id: video.id }, data: { xaiRequestId: requestId } });
  } catch (err) {
    const message = err instanceof HttpError ? err.message : "The video job didn't start.";
    await failAndRefund(deps, video.id, `${message} Your credit was refunded.`);
    throw err;
  }
}

/** Marks a pending clip failed and returns its credit. Safe to call twice: only the first call refunds. */
export async function failAndRefund({ prisma }: Pick<Deps, "prisma">, videoId: string, error: string) {
  return prisma.$transaction(async (tx) => {
    const video = await tx.video.findUnique({ where: { id: videoId } });
    if (!video) return false;
    const moved = await tx.video.updateMany({
      where: { id: videoId, status: "pending" },
      data: { status: "failed", error: error.slice(0, 400), completedAt: new Date() },
    });
    if (moved.count !== 1) return false;
    await tx.user.update({ where: { id: video.userId }, data: { credits: { increment: 1 } } });
    await tx.creditEntry.create({
      data: { userId: video.userId, delta: 1, reason: "video_refund", videoId, note: REFUND_NOTE },
    });
    return true;
  });
}

/** One pass over pending clips: store finished ones, refund failed or stuck ones. */
export async function pollVideos(deps: Deps) {
  const { prisma, video: gen, storage, config, logger } = deps;
  const pending = await prisma.video.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, take: 20 });
  for (const video of pending) {
    const age = Date.now() - video.createdAt.getTime();
    if (!video.xaiRequestId) {
      // The start call never recorded a job (e.g. a crash mid-request).
      if (age > 2 * 60_000) await failAndRefund(deps, video.id, "The clip never started. Your credit was refunded.");
      continue;
    }
    if (age > config.videoTimeoutMs) {
      await failAndRefund(deps, video.id, "The clip took too long. Your credit was refunded.");
      continue;
    }
    try {
      const state = await gen.status(video.xaiRequestId);
      if (state.status === "done") {
        const bytes = await gen.download(video.xaiRequestId, state.url);
        const fileKey = `videos/${video.userId}/${video.id}.mp4`;
        await storage.put(fileKey, bytes, "video/mp4");
        await prisma.video.updateMany({
          where: { id: video.id, status: "pending" },
          data: { status: "ready", fileKey, completedAt: new Date() },
        });
      } else if (state.status === "failed" || state.status === "expired") {
        await failAndRefund(deps, video.id, `${state.error || "The clip didn't finish."} Your credit was refunded.`);
      } else {
        await prisma.video.update({ where: { id: video.id }, data: { checks: { increment: 1 } } });
      }
    } catch (err) {
      logger.warn({ err, videoId: video.id }, "video poll failed; will retry");
    }
  }
}

export function startVideoPoller(deps: Deps) {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    pollVideos(deps)
      .catch((err) => deps.logger.error({ err }, "video poller crashed"))
      .finally(() => {
        running = false;
      });
  }, deps.config.pollIntervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
