import { PrismaClient } from "@prisma/client";
import type { Response } from "express";
import pino from "pino";
import request from "supertest";
import { vi } from "vitest";
import { createApp } from "../src/app";
import { loadConfig, type Config } from "../src/config";
import type { Deps } from "../src/deps";
import type { Mail } from "../src/mailer";
import type { SendOptions, Storage } from "../src/storage";
import { xaiVideo } from "../src/video-gen";
import type { VideoState, Xai } from "../src/xai";
import { TEST_DATABASE_URL } from "./global-setup";

export const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "UsageEvent", "CreditEntry", "Video", "VoiceTake", "Project", "PasswordReset", "Session", "User" CASCADE',
  );
}

export class MemoryStorage implements Storage {
  files = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Buffer, contentType: string) {
    this.files.set(key, { body, contentType });
  }
  async read(key: string) {
    return this.files.get(key)?.body ?? null;
  }
  async remove(key: string) {
    this.files.delete(key);
  }
  async send(res: Response, key: string, options: SendOptions) {
    const file = this.files.get(key);
    if (!file) {
      res.status(404).end();
      return;
    }
    res.type(options.contentType).send(file.body);
  }
}

export function fakeXai() {
  const state: { video: VideoState } = { video: { status: "pending", url: "", error: "" } };
  const xai = {
    configured: true,
    writeScript: vi.fn(async () => ({
      hook: "Fresh hook from the writer.",
      body: "A body line with one concrete detail.",
      cta: "It's linked below.",
      altHooks: ["Alt hook one.", "Alt hook two."],
    })),
    speak: vi.fn(async () => ({
      audio: Buffer.from("fake-mp3"),
      contentType: "audio/mpeg",
      duration: 1.2,
      chars: ["H", "i"],
      times: [
        [0, 0.5],
        [0.5, 1.2],
      ],
    })),
    startVideo: vi.fn(async () => `req_${Math.random().toString(36).slice(2, 10)}`),
    videoStatus: vi.fn(async () => state.video),
    download: vi.fn(async () => Buffer.from("fake-mp4")),
  } satisfies Xai;
  return { xai, state };
}

export function makeDeps(overrides: Partial<Record<string, string>> = {}) {
  const config: Config = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    WEB_ORIGIN: "http://localhost:5173",
    BCRYPT_ROUNDS: "4",
    RATE_LIMIT_AUTH: "1000",
    FREE_CREDITS: "3",
    ...overrides,
  });
  const { xai, state } = fakeXai();
  const storage = new MemoryStorage();
  const mail: Mail[] = [];
  const deps: Deps = {
    config,
    prisma,
    logger: pino({ level: "silent" }),
    storage,
    xai,
    video: xaiVideo(xai),
    mailer: { send: async (m) => void mail.push(m) },
  };
  return { deps, app: createApp(deps), xai, videoState: state, storage, mail };
}

export async function signUp(app: ReturnType<typeof createApp>, email = "ana@example.com") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({ name: "Ana", email, password: "correct-horse" });
  if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
