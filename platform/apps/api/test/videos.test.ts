import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { upstream } from "../src/errors";
import { pollVideos } from "../src/videos/service";
import { makeDeps, prisma, resetDb, signUp } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup(overrides: Partial<Record<string, string>> = {}) {
  const ctx = makeDeps(overrides);
  const agent = await signUp(ctx.app);
  const { body } = await agent.post("/api/projects").send({ templateId: "dew" });
  return { ...ctx, agent, projectId: body.project.id as string };
}

describe("videos", () => {
  it("charges one credit, renders, stores the clip and serves it", async () => {
    const { agent, projectId, deps, videoState, xai } = await setup();
    const started = await agent.post(`/api/projects/${projectId}/videos`).send({});
    expect(started.status).toBe(201);
    expect(started.body.video).toMatchObject({ status: "pending", url: null, hook: expect.stringMatching(/thick creams/) });
    expect(xai.startVideo).toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: "9:16", portrait: expect.stringMatching(/^data:image\/jpeg;base64,/) }),
    );
    expect((await agent.get("/api/credits")).body.balance).toBe(2);

    await pollVideos(deps);
    const stillPending = await agent.get(`/api/videos/${started.body.video.id}`);
    expect(stillPending.body.video.status).toBe("pending");

    videoState.video = { status: "done", url: "https://x.ai/v.mp4", error: "" };
    await pollVideos(deps);
    const ready = await agent.get(`/api/videos/${started.body.video.id}`);
    expect(ready.body.video.status).toBe("ready");
    expect(ready.body.video.url).toBe(`/api/media/videos/${started.body.video.id}`);

    const file = await agent.get(`${ready.body.video.url}?download=1`);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toMatch(/video\/mp4/);
    expect((await agent.get("/api/videos")).body.videos).toHaveLength(1);
  });

  it("refunds a failed clip exactly once", async () => {
    const { agent, projectId, deps, videoState } = await setup();
    const started = await agent.post(`/api/projects/${projectId}/videos`).send({});
    videoState.video = { status: "failed", url: "", error: "Moderation blocked it." };
    await pollVideos(deps);
    await pollVideos(deps);

    const video = (await agent.get(`/api/videos/${started.body.video.id}`)).body.video;
    expect(video.status).toBe("failed");
    expect(video.error).toMatch(/Moderation blocked it\. Your credit was refunded\./);
    const credits = (await agent.get("/api/credits")).body;
    expect(credits.balance).toBe(3);
    expect(credits.entries.map((e: { reason: string }) => e.reason)).toEqual(["video_refund", "video_debit", "signup_grant"]);
  });

  it("refunds immediately when xAI refuses to start", async () => {
    const { agent, projectId, xai } = await setup();
    xai.startVideo.mockRejectedValueOnce(upstream("The video generator failed (500)."));
    const res = await agent.post(`/api/projects/${projectId}/videos`).send({});
    expect(res.status).toBe(502);
    expect((await agent.get("/api/credits")).body.balance).toBe(3);
  });

  it("stops at zero credits", async () => {
    const { agent, projectId } = await setup({ FREE_CREDITS: "0" });
    const res = await agent.post(`/api/projects/${projectId}/videos`).send({});
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("out_of_credits");
  });

  it("never spends the same credit twice under concurrent clicks", async () => {
    const { agent, projectId } = await setup({ FREE_CREDITS: "1", MAX_PENDING_VIDEOS: "5" });
    const results = await Promise.all([
      agent.post(`/api/projects/${projectId}/videos`).send({}),
      agent.post(`/api/projects/${projectId}/videos`).send({}),
      agent.post(`/api/projects/${projectId}/videos`).send({}),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 402, 402]);
    expect((await agent.get("/api/credits")).body.balance).toBe(0);
  });

  it("limits clips rendering at once", async () => {
    const { agent, projectId } = await setup({ MAX_PENDING_VIDEOS: "1" });
    expect((await agent.post(`/api/projects/${projectId}/videos`).send({})).status).toBe(201);
    expect((await agent.post(`/api/projects/${projectId}/videos`).send({})).status).toBe(429);
  });

  it("times out stuck clips with a refund", async () => {
    const { agent, projectId, deps } = await setup();
    const started = await agent.post(`/api/projects/${projectId}/videos`).send({});
    await prisma.video.update({
      where: { id: started.body.video.id },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });
    await pollVideos(deps);
    const video = (await agent.get(`/api/videos/${started.body.video.id}`)).body.video;
    expect(video.status).toBe("failed");
    expect((await agent.get("/api/credits")).body.balance).toBe(3);
  });
});
