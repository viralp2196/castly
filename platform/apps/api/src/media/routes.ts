import { Router } from "express";
import { currentUser, requireUser } from "../auth/middleware";
import type { Deps } from "../deps";
import { notFound } from "../errors";

const IMAGE_CONTENT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Owner-only access to stored media. Local storage streams; S3 redirects to a short-lived signed URL. */
export function mediaRouter({ prisma, storage }: Deps) {
  const router = Router();
  router.use(requireUser);

  router.get("/videos/:id", async (req, res) => {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: currentUser(req).id, status: "ready" },
      include: { project: { select: { title: true } } },
    });
    if (!video?.fileKey) throw notFound("That clip isn't ready.");
    const download = req.query.download === "1";
    await storage.send(res, video.fileKey, {
      contentType: "video/mp4",
      downloadName: download ? `${video.project?.title || "castly-clip"}-${video.id.slice(-6)}.mp4` : undefined,
    });
  });

  router.get("/voice/:id", async (req, res) => {
    const take = await prisma.voiceTake.findFirst({
      where: { id: req.params.id, project: { userId: currentUser(req).id } },
    });
    if (!take) throw notFound("That voice take doesn't exist.");
    await storage.send(res, take.audioKey, { contentType: take.contentType });
  });

  router.get("/projects/:id/product-image", async (req, res) => {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!project?.productImageKey) throw notFound("No product photo.");
    const ext = project.productImageKey.split(".").pop() ?? "jpg";
    await storage.send(res, project.productImageKey, { contentType: IMAGE_CONTENT[ext] ?? "image/jpeg" });
  });

  return router;
}
