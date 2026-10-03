import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  EMPTY_SCRIPT,
  TEMPLATES,
  createProjectSchema,
  cuesFromTimestamps,
  getCreator,
  getLanguage,
  joinScript,
  projectPatchSchema,
  scriptRequestSchema,
  voiceRequestSchema,
} from "@castly/shared";
import { Router } from "express";
import multer from "multer";
import { currentUser, requireUser } from "../auth/middleware";
import type { Deps } from "../deps";
import { badRequest, notFound, parse, unavailable } from "../errors";
import { readScript, toProject, toProjectSummary, toVideo, toVoiceTake } from "../serialize";
import { consumeQuota } from "../usage";
import { startVideo } from "../videos/service";

const IMAGE_TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

export function projectsRouter(deps: Deps) {
  const { prisma, storage, xai, config } = deps;
  const router = Router();
  router.use(requireUser);

  async function owned(userId: string, id: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw notFound("That project doesn't exist.");
    return project;
  }

  async function latestVideo(projectId: string) {
    return prisma.video.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  router.get("/", async (req, res) => {
    const projects = await prisma.project.findMany({
      where: { userId: currentUser(req).id },
      orderBy: { updatedAt: "desc" },
      include: { videos: { orderBy: { createdAt: "desc" }, take: 1 } },
      take: 200,
    });
    res.json({ projects: projects.map((p) => toProjectSummary(p, p.videos[0] ?? null)) });
  });

  router.post("/", async (req, res) => {
    const input = parse(createProjectSchema, req.body);
    const template = input.templateId ? TEMPLATES.find((t) => t.id === input.templateId) : undefined;
    if (input.templateId && !template) throw badRequest("That template doesn't exist.");
    const project = await prisma.project.create({
      data: {
        userId: currentUser(req).id,
        script: (template ? template.script : EMPTY_SCRIPT) as Prisma.InputJsonValue,
        ...(template && {
          title: template.title,
          product: template.product,
          pitch: template.pitch,
          audience: template.audience,
          offer: template.offer,
          angle: template.angle,
          creatorId: template.creatorId,
          sceneId: template.sceneId,
          format: template.format,
        }),
      },
    });
    res.status(201).json({ project: toProject(project) });
  });

  router.get("/:id", async (req, res) => {
    const project = await owned(currentUser(req).id, req.params.id);
    res.json({ project: toProject(project, await latestVideo(project.id)) });
  });

  router.patch("/:id", async (req, res) => {
    const userId = currentUser(req).id;
    const patch = parse(projectPatchSchema, req.body);
    await owned(userId, req.params.id);
    const { script, ...rest } = patch;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { ...rest, ...(script && { script: script as Prisma.InputJsonValue }) },
    });
    res.json({ project: toProject(project, await latestVideo(project.id)) });
  });

  router.delete("/:id", async (req, res) => {
    const project = await owned(currentUser(req).id, req.params.id);
    const takes = await prisma.voiceTake.findMany({ where: { projectId: project.id }, select: { audioKey: true } });
    await prisma.project.delete({ where: { id: project.id } });
    await Promise.allSettled([
      ...takes.map((t) => storage.remove(t.audioKey)),
      project.productImageKey ? storage.remove(project.productImageKey) : Promise.resolve(),
    ]);
    res.status(204).end();
  });

  router.put("/:id/product-image", upload.single("image"), async (req, res) => {
    const userId = currentUser(req).id;
    const project = await owned(userId, String(req.params.id));
    const file = req.file;
    if (!file) throw badRequest("Choose a photo to upload.");
    const type = IMAGE_TYPES[file.mimetype];
    if (!type || !type.magic(file.buffer)) throw badRequest("Use a JPEG, PNG or WebP photo.");
    const key = `products/${userId}/${project.id}-${randomUUID()}.${type.ext}`;
    await storage.put(key, file.buffer, file.mimetype);
    const updated = await prisma.project.update({ where: { id: project.id }, data: { productImageKey: key } });
    if (project.productImageKey) await storage.remove(project.productImageKey).catch(() => undefined);
    res.json({ project: toProject(updated, await latestVideo(project.id)) });
  });

  router.delete("/:id/product-image", async (req, res) => {
    const project = await owned(currentUser(req).id, req.params.id);
    const updated = await prisma.project.update({ where: { id: project.id }, data: { productImageKey: null } });
    if (project.productImageKey) await storage.remove(project.productImageKey).catch(() => undefined);
    res.json({ project: toProject(updated, await latestVideo(project.id)) });
  });

  router.post("/:id/script", async (req, res) => {
    const userId = currentUser(req).id;
    const input = parse(scriptRequestSchema, req.body);
    const project = await owned(userId, req.params.id);
    if (!project.product.trim()) throw badRequest("Name the product first.", { product: "Name the product first." });
    if (!xai.configured) throw unavailable("Script writing isn't configured on this server yet.");
    await consumeQuota(prisma, userId, "script", config.dailyScriptLimit);
    const draft = await xai.writeScript({
      product: project.product,
      pitch: project.pitch,
      audience: project.audience,
      offer: project.offer,
      angle: project.angle,
      languageLabel: getLanguage(project.language).label,
      mode: input.mode,
      take: input.take,
    });
    const current = readScript(project.script);
    const script =
      input.mode === "hooks"
        ? { ...current, hook: draft.hook || current.hook, altHooks: draft.altHooks }
        : draft;
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { script: script as Prisma.InputJsonValue },
    });
    res.json({ project: toProject(updated, await latestVideo(project.id)) });
  });

  router.post("/:id/voice", async (req, res) => {
    const userId = currentUser(req).id;
    const input = parse(voiceRequestSchema, req.body);
    const project = await owned(userId, req.params.id);
    const text = (input.text ?? joinScript(readScript(project.script))).slice(0, 900);
    if (text.length < 2) throw badRequest("Write a line before you hear it.");
    const voiceId = getCreator(project.creatorId).voiceId;
    const language = getLanguage(project.language).tts;
    const speed = project.speed;

    // Same words, voice and pace already rendered: replay it instead of spending another call.
    const existing = await prisma.voiceTake.findFirst({
      where: { projectId: project.id, text, voiceId, language, speed },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      res.json({ take: toVoiceTake(existing), cached: true });
      return;
    }

    if (!xai.configured) throw unavailable("Voice isn't configured on this server yet.");
    await consumeQuota(prisma, userId, "voice", config.dailyVoiceLimit);
    const spoken = await xai.speak({ text, voiceId, language, speed });
    const ext = spoken.contentType.includes("wav") ? "wav" : "mp3";
    const audioKey = `voice/${userId}/${randomUUID()}.${ext}`;
    await storage.put(audioKey, spoken.audio, spoken.contentType);
    const take = await prisma.voiceTake.create({
      data: {
        projectId: project.id,
        text,
        voiceId,
        language,
        speed,
        audioKey,
        contentType: spoken.contentType,
        duration: spoken.duration,
        cues: cuesFromTimestamps(spoken.chars, spoken.times, spoken.duration, text) as unknown as Prisma.InputJsonValue,
      },
    });
    res.status(201).json({ take: toVoiceTake(take), cached: false });
  });

  router.post("/:id/videos", async (req, res) => {
    const user = currentUser(req);
    const project = await owned(user.id, req.params.id);
    const video = await startVideo(deps, user.id, project);
    res.status(201).json({ video: toVideo({ ...video, project: { title: project.title } }) });
  });

  return router;
}
