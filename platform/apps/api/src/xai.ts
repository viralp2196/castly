import type { Script } from "@castly/shared";
import { unavailable, upstream, HttpError } from "./errors";

const BASE = "https://api.x.ai/v1";

export type ScriptInput = {
  product: string;
  pitch: string;
  audience: string;
  offer: string;
  angle: string;
  languageLabel: string;
  brief?: string;
  mode: "full" | "hooks";
  take: number;
};

export type SpeakInput = { text: string; voiceId: string; language: string; speed: number };
export type SpeakResult = { audio: Buffer; contentType: string; duration: number; chars: string[]; times: number[][] };

export type VideoInput = { prompt: string; portrait: string; productImage?: string; aspectRatio: string };
export type VideoState = { status: "pending" | "done" | "failed" | "expired"; url: string; error: string };

export interface Xai {
  readonly configured: boolean;
  writeScript(input: ScriptInput): Promise<Script>;
  speak(input: SpeakInput): Promise<SpeakResult>;
  startVideo(input: VideoInput): Promise<string>;
  videoStatus(requestId: string): Promise<VideoState>;
  download(url: string): Promise<Buffer>;
}

const clean = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function readContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
      return "";
    })
    .join("");
}

function readJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

export function buildVideoPrompt(input: {
  sceneDetail: string;
  hook: string;
  format: string;
  product: string;
  hasProductImage: boolean;
  /** The model gets the portrait (and product) as subject references instead of an opening frame. */
  subjectRefs?: boolean;
}) {
  const person = input.subjectRefs ? "The person from the first reference image" : "The same person from the opening frame";
  const photo = input.subjectRefs ? "the second reference image" : "the reference photo";
  const hold =
    input.format === "in-hand" && input.hasProductImage
      ? ` They hold ${input.product || "the product"} from ${photo} so the pack is visible.`
      : input.product
        ? ` They are talking about ${input.product}.`
        : "";
  return `${person}, filmed on a phone, ${input.sceneDetail}. They look into the lens and say, casually, not like a commercial: "${input.hook}". Natural blinks, a small nod, handheld, no captions, no logos, no extra people.${hold}`;
}

export function createXai(options: { apiKey?: string; fetch?: typeof fetch }): Xai {
  const apiKey = options.apiKey;
  const doFetch = options.fetch ?? fetch;

  const key = () => {
    if (!apiKey) throw unavailable("AI generation isn't configured on this server yet.");
    return apiKey;
  };

  async function call(path: string, body: unknown) {
    const res = await doFetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function failure(res: Response, label: string): Promise<never> {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    if (res.status === 429) throw new HttpError(429, "rate_limited", `${label} is busy right now. Try again in a minute.`);
    throw upstream(`${label} failed (${res.status}).${detail ? ` ${detail}` : ""}`);
  }

  return {
    configured: Boolean(apiKey),

    async writeScript(input) {
      const system = `You write short UGC ad scripts spoken to a phone camera by a real person.
Return only JSON with keys hook, body, cta, altHooks.
Rules:
- hook: 1 sentence, under 18 words, sounds like speech
- body: 2 or 3 sentences, under 55 words, one concrete detail
- cta: 1 sentence, under 16 words, points to a link without saying "link in bio" unless asked
- altHooks: exactly 2 alternate hooks, same rules
- language: write the whole script in ${input.languageLabel}
- contractions, no hashtags, no emojis, no stage directions, no quotes around the lines
- do not invent prices, cures, celebrity use, or studies
- if the product is unsafe, sexual, or a scam, return hook, body, and cta as empty strings and put the reason in altHooks[0]
- variation ${input.take}: make this pass different from a generic ad`;

      const facts = `Product: ${input.product}
Pitch: ${input.pitch || "not specified"}
Audience: ${input.audience || "not specified"}
Offer: ${input.offer || "not specified"}
Angle: ${input.angle}`;
      const user =
        input.mode === "hooks"
          ? `Write only fresh hooks for this ad. Keep body and cta short placeholders if needed, but altHooks must be the two new hooks and hook a third.\n${facts}\nNotes: ${input.brief || "none"}`
          : `Write the ad.\n${facts}\nStructure notes: ${input.brief || "Sound like a person who already uses it."}`;

      const res = await call("/chat/completions", {
        model: "grok-4.5",
        temperature: 0.8,
        max_tokens: 480,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      if (!res.ok) await failure(res, "The script writer");
      const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const text = readContent(body.choices?.[0]?.message?.content);
      let parsed: Record<string, unknown>;
      try {
        parsed = readJson(text);
      } catch {
        throw upstream("Couldn't read a script from the writer. Try again.");
      }
      const hook = clean(parsed.hook, 220);
      const scriptBody = clean(parsed.body, 600);
      const cta = clean(parsed.cta, 200);
      const altHooks = (Array.isArray(parsed.altHooks) ? parsed.altHooks : [])
        .map((item) => clean(item, 220))
        .filter(Boolean)
        .slice(0, 3);
      if (!hook && !scriptBody) {
        throw new HttpError(422, "refused", altHooks[0] || "The writer wouldn't draft that. Try a plainer product.");
      }
      return { hook, body: scriptBody, cta, altHooks };
    },

    async speak(input) {
      const res = await call("/tts", {
        text: input.text,
        voice_id: input.voiceId,
        language: input.language,
        speed: input.speed,
        with_timestamps: true,
      });
      if (!res.ok) await failure(res, "The voice");
      const body = (await res.json()) as {
        audio?: string;
        content_type?: string;
        duration?: number;
        audio_timestamps?: { graph_chars?: string[]; graph_times?: number[][] };
      };
      if (!body.audio) throw upstream("The voice came back empty. Try again.");
      return {
        audio: Buffer.from(body.audio, "base64"),
        contentType: body.content_type || "audio/mpeg",
        duration: Number(body.duration) || 0,
        chars: body.audio_timestamps?.graph_chars ?? [],
        times: body.audio_timestamps?.graph_times ?? [],
      };
    },

    async startVideo(input) {
      const payload: Record<string, unknown> = {
        model: "grok-imagine-video-1.5",
        prompt: input.prompt,
        image: { url: input.portrait },
        duration: 6,
        aspect_ratio: input.aspectRatio,
        resolution: "720p",
      };
      if (input.productImage) payload.reference_images = [{ url: input.productImage }];
      let res = await call("/videos/generations", payload);
      if (!res.ok && input.productImage && (res.status === 400 || res.status === 422)) {
        delete payload.reference_images;
        res = await call("/videos/generations", payload);
      }
      if (!res.ok) await failure(res, "The video generator");
      const started = (await res.json()) as { request_id?: string };
      if (!started.request_id) throw upstream("The video job didn't start.");
      return started.request_id;
    },

    async videoStatus(requestId) {
      const res = await doFetch(`${BASE}/videos/${encodeURIComponent(requestId)}`, {
        headers: { Authorization: `Bearer ${key()}` },
      });
      if (!res.ok) await failure(res, "The video status check");
      const body = (await res.json()) as { status?: string; video?: { url?: string }; error?: { message?: string } | string };
      const status = (["done", "failed", "expired"].includes(body.status ?? "") ? body.status : "pending") as VideoState["status"];
      const message = typeof body.error === "string" ? body.error : body.error?.message || "The clip didn't finish.";
      return { status, url: body.video?.url || "", error: status === "failed" || status === "expired" ? message : "" };
    },

    async download(url) {
      const res = await doFetch(url);
      if (!res.ok) throw upstream(`Couldn't download the finished clip (${res.status}).`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}
