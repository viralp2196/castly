import type {
  CreditEntry as DbCreditEntry,
  Project as DbProject,
  User as DbUser,
  Video as DbVideo,
  VoiceTake as DbVoiceTake,
} from "@prisma/client";
import {
  EMPTY_SCRIPT,
  scriptSchema,
  type CreditEntry,
  type Project,
  type ProjectSummary,
  type Script,
  type User,
  type Video,
  type VoiceTake,
  type WordCue,
} from "@castly/shared";

export function toUser(user: DbUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    createdAt: user.createdAt.toISOString(),
  };
}

export function readScript(value: unknown): Script {
  const parsed = scriptSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...EMPTY_SCRIPT };
}

type VideoWithProject = DbVideo & { project?: { title: string } | null };

export function toVideo(video: VideoWithProject): Video {
  return {
    id: video.id,
    projectId: video.projectId,
    projectTitle: video.project?.title ?? null,
    status: video.status,
    hook: video.hook,
    aspect: video.aspect as Video["aspect"],
    creatorId: video.creatorId,
    url: video.status === "ready" && video.fileKey ? `/api/media/videos/${video.id}` : null,
    error: video.error,
    createdAt: video.createdAt.toISOString(),
    completedAt: video.completedAt?.toISOString() ?? null,
  };
}

export function toProject(project: DbProject, latest: DbVideo | null = null): Project {
  return {
    id: project.id,
    title: project.title,
    product: project.product,
    pitch: project.pitch,
    audience: project.audience,
    offer: project.offer,
    angle: project.angle as Project["angle"],
    language: project.language as Project["language"],
    creatorId: project.creatorId,
    sceneId: project.sceneId,
    format: project.format as Project["format"],
    aspect: project.aspect as Project["aspect"],
    captionStyle: project.captionStyle as Project["captionStyle"],
    speed: project.speed as Project["speed"],
    script: readScript(project.script),
    productImageUrl: project.productImageKey
      ? `/api/media/projects/${project.id}/product-image?v=${encodeURIComponent(project.productImageKey.slice(-12))}`
      : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    latestVideo: latest ? toVideo(latest) : null,
  };
}

export function toProjectSummary(project: DbProject, latest: DbVideo | null): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    product: project.product,
    creatorId: project.creatorId,
    aspect: project.aspect as Project["aspect"],
    updatedAt: project.updatedAt.toISOString(),
    latestVideo: latest ? toVideo(latest) : null,
    hook: readScript(project.script).hook,
  };
}

export function toVoiceTake(take: DbVoiceTake): VoiceTake {
  return {
    id: take.id,
    text: take.text,
    url: `/api/media/voice/${take.id}`,
    duration: take.duration,
    cues: Array.isArray(take.cues) ? (take.cues as unknown as WordCue[]) : [],
  };
}

export function toCreditEntry(entry: DbCreditEntry): CreditEntry {
  return {
    id: entry.id,
    delta: entry.delta,
    reason: entry.reason,
    note: entry.note,
    videoId: entry.videoId,
    createdAt: entry.createdAt.toISOString(),
  };
}
