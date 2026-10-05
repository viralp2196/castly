import { z } from "zod";

const flag = z.enum(["true", "false", "1", "0"]).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  XAI_API_KEY: z.string().optional(),
  LTX_API_URL: z.string().optional(),
  LTX_DURATION: z.coerce.number().int().min(1).max(10).default(6),
  LTX_STEPS: z.coerce.number().int().min(4).max(16).default(8),
  LTX_ENHANCE: flag,
  FREE_CREDITS: z.coerce.number().int().min(0).default(3),
  DAILY_SCRIPT_LIMIT: z.coerce.number().int().min(0).default(50),
  DAILY_VOICE_LIMIT: z.coerce.number().int().min(0).default(60),
  MAX_PENDING_VIDEOS: z.coerce.number().int().min(1).default(2),
  SESSION_DAYS: z.coerce.number().int().min(1).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(11),
  RATE_LIMIT_AUTH: z.coerce.number().int().min(1).default(20),
  COOKIE_SECURE: flag,
  TRUST_PROXY: flag,
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("Castly <no-reply@castly.local>"),
  POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  VIDEO_TIMEOUT_MINUTES: z.coerce.number().int().min(1).default(20),
  SERVE_WEB_DIST: z.string().optional(),
});

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  webOrigins: string[];
  publicWebUrl: string;
  xaiApiKey: string | undefined;
  /** When set, clips render on this LTX-2.3 server instead of xAI. */
  ltxApiUrl: string | undefined;
  ltxDuration: number;
  ltxSteps: number;
  /** The server's prompt enhancer rewrites our prompt before rendering. */
  ltxEnhance: boolean;
  freeCredits: number;
  dailyScriptLimit: number;
  dailyVoiceLimit: number;
  maxPendingVideos: number;
  sessionDays: number;
  bcryptRounds: number;
  rateLimitAuth: number;
  cookieSecure: boolean;
  trustProxy: boolean;
  storage:
    | { driver: "local"; dir: string }
    | {
        driver: "s3";
        bucket: string;
        region: string;
        endpoint?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
      };
  smtpUrl: string | undefined;
  mailFrom: string;
  pollIntervalMs: number;
  videoTimeoutMs: number;
  serveWebDist: string | undefined;
};

const isOn = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value === "true" || value === "1";

const blank = (value: string | undefined) => (value && value.trim() ? value.trim() : undefined);

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  const env = parsed.data;
  const webOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  if (env.STORAGE_DRIVER === "s3" && !blank(env.S3_BUCKET)) {
    throw new Error("Invalid environment:\n  S3_BUCKET: required when STORAGE_DRIVER=s3");
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    webOrigins,
    publicWebUrl: webOrigins[0] ?? "http://localhost:5173",
    xaiApiKey: blank(env.XAI_API_KEY),
    ltxApiUrl: blank(env.LTX_API_URL),
    ltxDuration: env.LTX_DURATION,
    ltxSteps: env.LTX_STEPS,
    ltxEnhance: isOn(env.LTX_ENHANCE, true),
    freeCredits: env.FREE_CREDITS,
    dailyScriptLimit: env.DAILY_SCRIPT_LIMIT,
    dailyVoiceLimit: env.DAILY_VOICE_LIMIT,
    maxPendingVideos: env.MAX_PENDING_VIDEOS,
    sessionDays: env.SESSION_DAYS,
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimitAuth: env.RATE_LIMIT_AUTH,
    cookieSecure: isOn(env.COOKIE_SECURE, env.NODE_ENV === "production"),
    trustProxy: isOn(env.TRUST_PROXY, false),
    storage:
      env.STORAGE_DRIVER === "s3"
        ? {
            driver: "s3",
            bucket: env.S3_BUCKET!.trim(),
            region: env.S3_REGION,
            endpoint: blank(env.S3_ENDPOINT),
            accessKeyId: blank(env.S3_ACCESS_KEY_ID),
            secretAccessKey: blank(env.S3_SECRET_ACCESS_KEY),
          }
        : { driver: "local", dir: env.STORAGE_DIR },
    smtpUrl: blank(env.SMTP_URL),
    mailFrom: env.MAIL_FROM,
    pollIntervalMs: env.POLL_INTERVAL_MS,
    videoTimeoutMs: env.VIDEO_TIMEOUT_MINUTES * 60_000,
    serveWebDist: blank(env.SERVE_WEB_DIST),
  };
}
