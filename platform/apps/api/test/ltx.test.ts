import { describe, expect, it, vi } from "vitest";
import { createLtx } from "../src/video-gen";

const PNG = `data:image/png;base64,${Buffer.from("portrait").toString("base64")}`;
const JPG = `data:image/jpeg;base64,${Buffer.from("product").toString("base64")}`;

function ltxWith(respond: (url: string, init?: RequestInit) => Response) {
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => respond(String(url), init));
  const ltx = createLtx({
    baseUrl: "https://ltx.example/",
    duration: 6,
    steps: 8,
    enhance: false,
    fetch: fetch as typeof globalThis.fetch,
  });
  return { ltx, fetch };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("LTX video generator", () => {
  it("sends the portrait and product as subject references", async () => {
    const { ltx, fetch } = ltxWith(() => json({ job_id: "abc123", status: "queued" }));
    const jobId = await ltx.start({ key: "vid_1", prompt: "Say the hook.", portrait: PNG, productImage: JPG, aspectRatio: "9:16" });

    expect(jobId).toBe("abc123");
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://ltx.example/generate-character");
    const form = init!.body as FormData;
    const images = form.getAll("images") as File[];
    expect(images.map((f) => f.type)).toEqual(["image/png", "image/jpeg"]);
    expect(form.get("mode")).toBe("subjects-only");
    expect(form.get("prompt")).toBe("Say the hook.");
    expect(form.get("comic_id")).toBe("castly");
    expect(form.get("panel_id")).toBe("vid_1");
    expect(form.get("duration")).toBe("6");
    expect(form.get("enhance")).toBe("false");
  });

  it("sends only the portrait when there is no product photo", async () => {
    const { ltx, fetch } = ltxWith(() => json({ job_id: "abc123" }));
    await ltx.start({ key: "vid_1", prompt: "Say the hook.", portrait: PNG, aspectRatio: "9:16" });
    expect((fetch.mock.calls[0]![1]!.body as FormData).getAll("images")).toHaveLength(1);
  });

  it("maps job states to pending, done and failed", async () => {
    const replies = [
      json({ job_id: "a", status: "generating", progress: 20, s3_url: null }),
      json({ job_id: "a", status: "completed", s3_url: "https://s3.example/video.mp4" }),
      json({ job_id: "a", status: "failed", error: "CUDA out of memory" }),
      json({ detail: "Job not found" }, 404),
    ];
    const { ltx } = ltxWith(() => replies.shift()!);

    expect(await ltx.status("a")).toEqual({ status: "pending", url: "", error: "" });
    expect(await ltx.status("a")).toEqual({ status: "done", url: "https://s3.example/video.mp4", error: "" });
    expect(await ltx.status("a")).toEqual({ status: "failed", url: "", error: "CUDA out of memory" });
    expect((await ltx.status("a")).status).toBe("expired");
  });

  it("downloads through /download and rejects a non-video reply", async () => {
    const mp4 = Buffer.alloc(4096, 1);
    const replies = [
      new Response(mp4, { headers: { "Content-Type": "video/mp4" } }),
      json({ status: "generating" }),
    ];
    const { ltx, fetch } = ltxWith(() => replies.shift()!);

    expect((await ltx.download("a b", "")).length).toBe(4096);
    expect(fetch.mock.calls[0]![0]).toBe("https://ltx.example/download/a%20b");
    await expect(ltx.download("a", "")).rejects.toThrow(/something other than a video/);
  });

  it("turns a server error into an upstream error with the detail", async () => {
    const { ltx } = ltxWith(() => new Response("images: need 1-4", { status: 422 }));
    await expect(ltx.start({ key: "v", prompt: "p", portrait: PNG, aspectRatio: "9:16" })).rejects.toThrow(
      /The video generator failed \(422\)\. images: need 1-4/,
    );
  });
});
