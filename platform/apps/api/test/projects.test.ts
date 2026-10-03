import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { makeDeps, prisma, resetDb, signUp } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe("projects", () => {
  it("requires sign-in", async () => {
    const { app } = makeDeps();
    expect((await request(app).get("/api/projects")).status).toBe(401);
  });

  it("creates from a template, lists, and patches", async () => {
    const { app } = makeDeps();
    const agent = await signUp(app);
    const created = await agent.post("/api/projects").send({ templateId: "dew" });
    expect(created.status).toBe(201);
    const project = created.body.project;
    expect(project).toMatchObject({ title: "Morning Dew Serum", creatorId: "maya" });
    expect(project.script.hook).toMatch(/thick creams/);

    const list = await agent.get("/api/projects");
    expect(list.body.projects).toHaveLength(1);
    expect(list.body.projects[0].hook).toBe(project.script.hook);

    const patched = await agent.patch(`/api/projects/${project.id}`).send({ creatorId: "kenji", aspect: "square", speed: 1.12 });
    expect(patched.status).toBe(200);
    expect(patched.body.project).toMatchObject({ creatorId: "kenji", aspect: "square", speed: 1.12 });

    const bad = await agent.patch(`/api/projects/${project.id}`).send({ creatorId: "nobody" });
    expect(bad.status).toBe(400);
    const sneaky = await agent.patch(`/api/projects/${project.id}`).send({ userId: "someone-else" });
    expect(sneaky.status).toBe(400);
  });

  it("keeps each user's projects private", async () => {
    const { app } = makeDeps();
    const ana = await signUp(app, "ana@example.com");
    const ben = await signUp(app, "ben@example.com");
    const { body } = await ana.post("/api/projects").send({});
    const id = body.project.id;
    expect((await ben.get(`/api/projects/${id}`)).status).toBe(404);
    expect((await ben.patch(`/api/projects/${id}`).send({ title: "mine now" })).status).toBe(404);
    expect((await ben.delete(`/api/projects/${id}`)).status).toBe(404);
    expect((await ben.get("/api/projects")).body.projects).toHaveLength(0);
    expect((await ana.get(`/api/projects/${id}`)).body.project.title).toBe("Untitled cut");
  });

  it("writes a script with xAI and saves it on the project", async () => {
    const { app, xai } = makeDeps();
    const agent = await signUp(app);
    const { body } = await agent.post("/api/projects").send({});
    const id = body.project.id;

    const noProduct = await agent.post(`/api/projects/${id}/script`).send({});
    expect(noProduct.status).toBe(400);

    await agent.patch(`/api/projects/${id}`).send({ product: "Cold brew", angle: "skeptic", language: "es" });
    const res = await agent.post(`/api/projects/${id}/script`).send({ mode: "full" });
    expect(res.status).toBe(200);
    expect(res.body.project.script.hook).toBe("Fresh hook from the writer.");
    expect(xai.writeScript).toHaveBeenCalledWith(expect.objectContaining({ product: "Cold brew", angle: "skeptic", languageLabel: "Spanish" }));
  });

  it("caps script drafts per day", async () => {
    const { app } = makeDeps({ DAILY_SCRIPT_LIMIT: "1" });
    const agent = await signUp(app);
    const { body } = await agent.post("/api/projects").send({ templateId: "tee" });
    expect((await agent.post(`/api/projects/${body.project.id}/script`).send({})).status).toBe(200);
    const capped = await agent.post(`/api/projects/${body.project.id}/script`).send({});
    expect(capped.status).toBe(429);
  });

  it("renders a voice take once and replays it for the same line", async () => {
    const { app, xai, storage } = makeDeps();
    const agent = await signUp(app);
    const { body } = await agent.post("/api/projects").send({ templateId: "dew" });
    const id = body.project.id;

    const first = await agent.post(`/api/projects/${id}/voice`).send({});
    expect(first.status).toBe(201);
    expect(first.body.take.cues).toEqual([{ word: "Hi", start: 0, end: 1.2 }]);
    expect(xai.speak).toHaveBeenCalledWith(expect.objectContaining({ voiceId: "ara", language: "en", speed: 1 }));

    const again = await agent.post(`/api/projects/${id}/voice`).send({});
    expect(again.status).toBe(200);
    expect(again.body.cached).toBe(true);
    expect(xai.speak).toHaveBeenCalledTimes(1);

    const audio = await agent.get(first.body.take.url);
    expect(audio.status).toBe(200);
    expect(audio.headers["content-type"]).toMatch(/audio\/mpeg/);
    expect(storage.files.size).toBe(1);
  });

  it("stores a product photo, rejects non-images, and serves it to the owner only", async () => {
    const { app } = makeDeps();
    const agent = await signUp(app, "ana@example.com");
    const other = await signUp(app, "ben@example.com");
    const { body } = await agent.post("/api/projects").send({});
    const id = body.project.id;

    const fake = await agent.put(`/api/projects/${id}/product-image`).attach("image", Buffer.from("not an image"), {
      filename: "x.jpg",
      contentType: "image/jpeg",
    });
    expect(fake.status).toBe(400);

    const ok = await agent.put(`/api/projects/${id}/product-image`).attach("image", JPEG, { filename: "p.jpg", contentType: "image/jpeg" });
    expect(ok.status).toBe(200);
    const url = ok.body.project.productImageUrl;
    expect(url).toMatch(/product-image/);
    expect((await agent.get(url)).status).toBe(200);
    expect((await other.get(url)).status).toBe(404);
  });
});
