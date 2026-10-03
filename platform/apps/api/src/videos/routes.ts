import { Router } from "express";
import { currentUser, requireUser } from "../auth/middleware";
import type { Deps } from "../deps";
import { badRequest, notFound } from "../errors";
import { toVideo } from "../serialize";

export function videosRouter({ prisma, storage }: Deps) {
  const router = Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const videos = await prisma.video.findMany({
      where: { userId: currentUser(req).id },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true } } },
      take: 200,
    });
    res.json({ videos: videos.map(toVideo) });
  });

  router.get("/:id", async (req, res) => {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: currentUser(req).id },
      include: { project: { select: { title: true } } },
    });
    if (!video) throw notFound("That clip doesn't exist.");
    res.json({ video: toVideo(video) });
  });

  router.delete("/:id", async (req, res) => {
    const video = await prisma.video.findFirst({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!video) throw notFound("That clip doesn't exist.");
    if (video.status === "pending") throw badRequest("Wait for the clip to finish before deleting it.");
    await prisma.video.delete({ where: { id: video.id } });
    if (video.fileKey) await storage.remove(video.fileKey).catch(() => undefined);
    res.status(204).end();
  });

  return router;
}
