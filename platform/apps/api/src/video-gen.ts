import { upstream, HttpError } from "./errors";
import type { VideoInput, VideoState, Xai } from "./xai";

/** Whatever renders clips: xAI by default, or the LTX-2.3 server when LTX_API_URL is set. */
export interface VideoGen {
  readonly name: "xai" | "ltx";
  readonly configured: boolean;
  /** True when the model reads the portrait as a subject reference rather than the opening frame. */
  readonly usesSubjectRefs: boolean;
  start(input: VideoInput & { key: string }): Promise<string>;
  status(jobId: string): Promise<VideoState>;
  /** Returns the finished mp4. `url` is whatever `status` reported. */
  download(jobId: string, url: string): Promise<Buffer>;
}

export function xaiVideo(xai: Xai): VideoGen {
  return {
    name: "xai",
    get configured() {
      return xai.configured;
    },
    usesSubjectRefs: false,
    start: (input) => xai.startVideo(input),
    async status(jobId) {
      const state = await xai.videoStatus(jobId);
      // xAI only counts as finished once it hands back a link to fetch.
      return state.status === "done" && !state.url ? { ...state, status: "pending" } : state;
    },
    download: (_jobId, url) => xai.download(url),
  };
}

const DONE = new Set(["completed", "complete", "done", "success", "succeeded", "finished"]);
const FAILED = new Set(["failed", "error", "errored", "cancelled", "canceled"]);

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("expected a base64 data URL");
  return new Blob([Buffer.from(match[2]!, "base64")], { type: match[1] });
}

const extFor = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

/**
 * LTX-2.3 Multi-Subject Reference (`POST /generate-character`). The creator portrait is the
 * first subject and the product photo, when there is one, the second.
 */
export function createLtx(options: {
  baseUrl: string;
  duration: number;
  steps: number;
  enhance: boolean;
  fetch?: typeof fetch;
}): VideoGen {
  const base = options.baseUrl.replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;
  // ngrok's free tier shows an HTML warning page to clients that don't send this.
  const headers = { "ngrok-skip-browser-warning": "1" };

  async function failure(res: Response, label: string): Promise<never> {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    if (res.status === 429 || res.status === 503) {
      throw new HttpError(429, "rate_limited", `${label} is busy right now. Try again in a minute.`);
    }
    throw upstream(`${label} failed (${res.status}).${detail ? ` ${detail}` : ""}`);
  }

  return {
    name: "ltx",
    configured: true,
    usesSubjectRefs: true,

    async start(input) {
      const form = new FormData();
      const images = [input.portrait, input.productImage].filter((src): src is string => Boolean(src));
      images.forEach((src, i) => {
        const blob = dataUrlToBlob(src);
        form.append("images", blob, `ref-${i}.${extFor(blob.type)}`);
      });
      form.append("prompt", input.prompt);
      form.append("mode", "subjects-only");
      form.append("comic_id", "castly");
      form.append("panel_id", input.key);
      form.append("duration", String(options.duration));
      form.append("steps", String(options.steps));
      form.append("enhance", String(options.enhance));

      const res = await doFetch(`${base}/generate-character`, {
        method: "POST",
        headers,
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) await failure(res, "The video generator");
      const started = (await res.json()) as { job_id?: string; id?: string };
      const jobId = started.job_id ?? started.id;
      if (!jobId) throw upstream("The video job didn't start.");
      return jobId;
    },

    async status(jobId) {
      const res = await doFetch(`${base}/status/${encodeURIComponent(jobId)}`, {
        headers,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) return { status: "expired", url: "", error: "The render server lost this clip." };
      if (!res.ok) await failure(res, "The video status check");
      const body = (await res.json()) as Record<string, unknown>;
      const raw = String(body.status ?? body.state ?? "").toLowerCase();
      const url = [body.s3_url, body.video_url, body.url].find((v): v is string => typeof v === "string" && v.length > 0);
      if (DONE.has(raw)) return { status: "done", url: url ?? "", error: "" };
      if (FAILED.has(raw)) {
        const error = typeof body.error === "string" && body.error ? body.error : "The clip didn't finish.";
        return { status: "failed", url: "", error: error.slice(0, 300) };
      }
      return { status: "pending", url: "", error: "" };
    },

    async download(jobId) {
      // /download serves the file or redirects to its S3 copy; fetch follows the redirect.
      const res = await doFetch(`${base}/download/${encodeURIComponent(jobId)}`, {
        headers,
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw upstream(`Couldn't download the finished clip (${res.status}).`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 1024 || (res.headers.get("content-type") ?? "").includes("json")) {
        throw upstream("The render server sent something other than a video.");
      }
      return bytes;
    },
  };
}
