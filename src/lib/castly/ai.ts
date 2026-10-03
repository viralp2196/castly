import { createServerFn } from "@tanstack/react-start";
import { CREATORS, LANGUAGES, SCENES } from "./catalog";

type ScriptRequest = {
  product?: string;
  pitch?: string;
  audience?: string;
  offer?: string;
  angle?: string;
  language?: string;
  brief?: string;
  mode?: string;
  take?: number;
};

type SpeakRequest = {
  text?: string;
  voiceId?: string;
  language?: string;
  speed?: number;
};

const VOICES = new Set([
  "ara",
  "eve",
  "leo",
  "liora",
  "luna",
  "orion",
  "rex",
  "sal",
]);

const scriptCache = new Map<string, string>();
const voiceCache = new Map<string, SpeakOk>();
let scriptCalls = 0;
let voiceCalls = 0;

type SpeakOk = {
  ok: true;
  audio: string;
  contentType: string;
  duration: number;
  chars: string[];
  times: number[][];
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function languageLabel(id: string) {
  return LANGUAGES.find((item) => item.id === id)?.label ?? "English";
}

function ttsCode(id: string) {
  return LANGUAGES.find((item) => item.id === id)?.tts ?? "en";
}

function readContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        return String((part as { text?: unknown }).text ?? "");
      }
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

async function grok(apiKey: string, system: string, user: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.8,
      max_tokens: 480,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false as const, error: err.slice(0, 180) || `Writer error ${res.status}` };
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  return { ok: true as const, text: readContent(body.choices?.[0]?.message?.content) };
}

export const writeScript = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Missing brief");
    return input as ScriptRequest;
  })
  .handler(async ({ data }) => {
    const product = clean(data.product, 80);
    if (!product) return { ok: false as const, error: "Name the product first." };
    const pitch = clean(data.pitch, 320);
    const audience = clean(data.audience, 120);
    const offer = clean(data.offer, 140);
    const angle = clean(data.angle, 80) || "confession";
    const language = languageLabel(clean(data.language, 12) || "en");
    const brief = clean(data.brief, 400);
    const mode = data.mode === "hooks" ? "hooks" : "full";
    const take = Math.max(0, Math.min(6, Number(data.take) || 0));

    if (scriptCalls >= 40) {
      return { ok: false as const, error: "The writer is paused for this session. Your drafts are still on the bench." };
    }

    const cacheKey = JSON.stringify({ product, pitch, audience, offer, angle, language, brief, mode, take });
    const cached = take === 0 ? scriptCache.get(cacheKey) : undefined;
    if (cached) return { ok: true as const, ...JSON.parse(cached) };

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Script writing isn't available in this preview." };

    const system = `You write short UGC ad scripts spoken to a phone camera by a real person.
Return only JSON with keys hook, body, cta, altHooks.
Rules:
- hook: 1 sentence, under 18 words, sounds like speech
- body: 2 or 3 sentences, under 55 words, one concrete detail
- cta: 1 sentence, under 16 words, points to a link without saying "link in bio" unless asked
- altHooks: exactly 2 alternate hooks, same rules
- language: write the whole script in ${language}
- contractions, no hashtags, no emojis, no stage directions, no quotes around the lines
- do not invent prices, cures, celebrity use, or studies
- if the product is unsafe, sexual, or a scam, return hook, body, and cta as empty strings and put the reason in altHooks[0]
- variation ${take}: make this pass different from a generic ad`;

    const user =
      mode === "hooks"
        ? `Write only fresh hooks for this ad. Keep body and cta short placeholders if needed, but altHooks must be the two new hooks and hook a third.
Product: ${product}
Pitch: ${pitch || "not specified"}
Audience: ${audience || "not specified"}
Offer: ${offer || "not specified"}
Angle: ${angle}
Notes: ${brief || "none"}`
        : `Write the ad.
Product: ${product}
Pitch: ${pitch || "not specified"}
Audience: ${audience || "not specified"}
Offer: ${offer || "not specified"}
Angle: ${angle}
Structure notes: ${brief || "Sound like a person who already uses it."}`;

    scriptCalls += 1;
    const result = await grok(apiKey, system, user);
    if (!result.ok) return result;

    let parsed: Record<string, unknown>;
    try {
      parsed = readJson(result.text);
    } catch {
      return { ok: false as const, error: result.text.slice(0, 220) || "Couldn't read a script. Try again." };
    }

    const hook = clean(parsed.hook, 220);
    const body = clean(parsed.body, 600);
    const cta = clean(parsed.cta, 200);
    const altRaw = Array.isArray(parsed.altHooks) ? parsed.altHooks : [];
    const altHooks = altRaw.map((item) => clean(item, 220)).filter(Boolean).slice(0, 3);
    if (!hook && !body) {
      return { ok: false as const, error: altHooks[0] || "The writer wouldn't draft that. Try a plainer product." };
    }

    const payload = { hook, body, cta, altHooks };
    if (take === 0) scriptCache.set(cacheKey, JSON.stringify(payload));
    return { ok: true as const, ...payload };
  });

export const speakAd = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Missing script");
    return input as SpeakRequest;
  })
  .handler(async ({ data }) => {
    const text = clean(data.text, 900);
    if (text.length < 2) return { ok: false as const, error: "Write a line before you hear it." };
    const voiceId = VOICES.has(clean(data.voiceId, 24)) ? clean(data.voiceId, 24) : "ara";
    const language = ttsCode(clean(data.language, 12) || "en");
    const requested = Number(data.speed);
    const speed = requested === 0.92 || requested === 1.12 ? requested : 1;

    const cacheKey = `${voiceId}|${language}|${speed}|${text}`;
    const cached = voiceCache.get(cacheKey);
    if (cached) return cached;

    if (voiceCalls >= 24) {
      return {
        ok: false as const,
        error: "Voice previews are paused for this session so we don't burn through them. Scripts are still saved.",
      };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Voice isn't available in this preview." };

    voiceCalls += 1;
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language,
        speed,
        with_timestamps: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false as const, error: err.slice(0, 180) || `Voice error ${res.status}` };
    }

    const body = (await res.json()) as {
      audio?: string;
      content_type?: string;
      duration?: number;
      audio_timestamps?: { graph_chars?: string[]; graph_times?: number[][] };
    };
    if (!body.audio) return { ok: false as const, error: "The voice came back empty. Try again." };

    const payload: SpeakOk = {
      ok: true,
      audio: body.audio,
      contentType: body.content_type || "audio/mpeg",
      duration: Number(body.duration) || 0,
      chars: body.audio_timestamps?.graph_chars ?? [],
      times: body.audio_timestamps?.graph_times ?? [],
    };
    if (voiceCache.size > 16) {
      const first = voiceCache.keys().next().value;
      if (first) voiceCache.delete(first);
    }
    voiceCache.set(cacheKey, payload);
    return payload;
  });

type CutRequest = {
  creatorId?: string;
  sceneId?: string;
  format?: string;
  aspect?: string;
  hook?: string;
  product?: string;
  portrait?: string;
  productImage?: string;
};

type CutJob = { requestId: string; url?: string; error?: string };

const cutJobs = new Map<string, CutJob>();
let videoStarts = 0;

function imageData(value: unknown, max: number) {
  const raw = String(value ?? "");
  if (!raw.startsWith("data:image/")) return "";
  if (raw.length < 32 || raw.length > max) return "";
  return raw;
}

function aspectRatio(id: string) {
  if (id === "square") return "1:1";
  if (id === "wide") return "16:9";
  return "9:16";
}

function cutCacheKey(data: {
  creatorId: string;
  sceneId: string;
  format: string;
  aspect: string;
  hook: string;
  product: string;
  portrait: string;
  productImage: string;
}) {
  const tail = (value: string) => value.slice(-48);
  return [
    data.creatorId,
    data.sceneId,
    data.format,
    data.aspect,
    data.hook,
    data.product,
    data.portrait.length,
    tail(data.portrait),
    data.productImage.length,
    tail(data.productImage),
  ].join("|");
}

async function readVideoStatus(apiKey: string, requestId: string) {
  const res = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false as const, error: err.slice(0, 180) || `Video error ${res.status}` };
  }
  const body = (await res.json()) as {
    status?: string;
    video?: { url?: string };
    error?: { message?: string } | string;
  };
  const status = body.status || "pending";
  const message =
    typeof body.error === "string" ? body.error : body.error?.message || "The clip didn't finish.";
  return {
    ok: true as const,
    status,
    url: body.video?.url || "",
    error: status === "failed" || status === "expired" ? message : "",
  };
}

export const startCutVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Missing cut");
    return input as CutRequest;
  })
  .handler(async ({ data }) => {
    const hook = clean(data.hook, 220);
    if (hook.length < 8) return { ok: false as const, error: "Write a hook before you generate a clip." };
    const creator = CREATORS.find((item) => item.id === clean(data.creatorId, 24));
    const scene = SCENES.find((item) => item.id === clean(data.sceneId, 24));
    if (!creator || !scene) return { ok: false as const, error: "Pick a creator first." };
    const portrait = imageData(data.portrait, 1_400_000);
    if (!portrait) return { ok: false as const, error: "Couldn't read the creator photo." };
    const productImage = imageData(data.productImage, 1_400_000);
    const product = clean(data.product, 80);
    const format = clean(data.format, 24);
    const aspect = aspectRatio(clean(data.aspect, 16));
    const key = cutCacheKey({
      creatorId: creator.id,
      sceneId: scene.id,
      format,
      aspect,
      hook,
      product,
      portrait,
      productImage,
    });
    const saved = cutJobs.get(key);
    if (saved?.requestId && !saved.url) {
      return { ok: true as const, status: "pending" as const, requestId: saved.requestId };
    }

    if (videoStarts >= 2) {
      return {
        ok: false as const,
        error: "Video clips are paused for this visit. Two is the limit, so a refresh doesn't keep spending.",
      };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Video isn't available in this preview." };

    const hold =
      format === "in-hand" && productImage
        ? ` They hold ${product || "the product"} from the reference photo so the pack is visible.`
        : product
          ? ` They are talking about ${product}.`
          : "";
    const prompt = `The same person from the opening frame, filmed on a phone, ${scene.detail}. They look into the lens and say, casually, not like a commercial: "${hook}". Natural blinks, a small nod, handheld, no captions, no logos, no extra people.${hold}`;

    const body: Record<string, unknown> = {
      model: "grok-imagine-video-1.5",
      prompt,
      image: { url: portrait },
      duration: 6,
      aspect_ratio: aspect,
      resolution: "720p",
    };
    if (productImage) body.reference_images = [{ url: productImage }];

    videoStarts += 1;
    let res = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && productImage && (res.status === 400 || res.status === 422)) {
      delete body.reference_images;
      res = await fetch("https://api.x.ai/v1/videos/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      videoStarts = Math.max(0, videoStarts - 1);
      const err = await res.text();
      return { ok: false as const, error: err.slice(0, 180) || `Video error ${res.status}` };
    }
    const started = (await res.json()) as { request_id?: string };
    if (!started.request_id) {
      videoStarts = Math.max(0, videoStarts - 1);
      return { ok: false as const, error: "The video job didn't start." };
    }
    cutJobs.set(key, { requestId: started.request_id });
    return { ok: true as const, status: "pending" as const, requestId: started.request_id };
  });

export const pollCutVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Missing job");
    return input as { requestId?: string };
  })
  .handler(async ({ data }) => {
    const requestId = clean(data.requestId, 80);
    if (!requestId) return { ok: false as const, error: "Missing video job." };
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Video isn't available in this preview." };
    const result = await readVideoStatus(apiKey, requestId);
    if (!result.ok) return result;
    if (result.status === "done" && result.url) {
      for (const job of cutJobs.values()) {
        if (job.requestId === requestId) job.url = result.url;
      }
    }
    if (result.status === "failed" || result.status === "expired") {
      for (const [key, job] of cutJobs) {
        if (job.requestId === requestId && !job.url) cutJobs.delete(key);
      }
    }
    return {
      ok: true as const,
      status: result.status,
      url: result.url,
      error: result.error,
      requestId,
    };
  });
