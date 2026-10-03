import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { makeDeps, prisma, resetDb, signUp } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** The signed-in user's email for this agent, or null when signed out. */
async function whoAmI(agent: { get: (url: string) => request.Test }) {
  const res = await agent.get("/api/auth/me");
  expect(res.status).toBe(200);
  return (res.body.user?.email as string | undefined) ?? null;
}

describe("auth", () => {
  it("registers, grants welcome credits and signs the user in", async () => {
    const { app } = makeDeps();
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/register").send({ name: "Ana", email: "Ana@Example.com", password: "correct-horse" });
    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/castly_session=.*HttpOnly.*SameSite=Lax/i);
    expect(res.body.user).toMatchObject({ email: "ana@example.com", name: "Ana", credits: 3 });
    expect(res.body.user.passwordHash).toBeUndefined();

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ana@example.com");

    const credits = await agent.get("/api/credits");
    expect(credits.body.balance).toBe(3);
    expect(credits.body.entries).toEqual([expect.objectContaining({ delta: 3, reason: "signup_grant" })]);
  });

  it("rejects a duplicate email with a field error", async () => {
    const { app } = makeDeps();
    await signUp(app);
    const res = await request(app).post("/api/auth/register").send({ name: "B", email: "ana@example.com", password: "another-pass" });
    expect(res.status).toBe(409);
    expect(res.body.error.fields.email).toBeTruthy();
  });

  it("validates input with per-field messages", async () => {
    const { app } = makeDeps();
    const res = await request(app).post("/api/auth/register").send({ name: "", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "name", "password"]);
  });

  it("logs in with the right password only, and logs out", async () => {
    const { app } = makeDeps();
    await signUp(app);
    const wrong = await request(app).post("/api/auth/login").send({ email: "ana@example.com", password: "wrong-pass" });
    expect(wrong.status).toBe(401);
    const unknown = await request(app).post("/api/auth/login").send({ email: "who@example.com", password: "wrong-pass" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);

    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send({ email: "ana@example.com", password: "correct-horse" })).status).toBe(200);
    expect(await whoAmI(agent)).toBe("ana@example.com");
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect(await whoAmI(agent)).toBeNull();
  });

  it("resets a password with a single-use emailed link and ends old sessions", async () => {
    const { app, mail } = makeDeps();
    const oldDevice = await signUp(app);

    const forgot = await request(app).post("/api/auth/forgot").send({ email: "ana@example.com" });
    expect(forgot.status).toBe(204);
    const silent = await request(app).post("/api/auth/forgot").send({ email: "nobody@example.com" });
    expect(silent.status).toBe(204);
    expect(mail).toHaveLength(1);
    const token = mail[0]!.text.match(/\/reset\/([A-Za-z0-9_-]+)/)?.[1];
    expect(token).toBeTruthy();

    const agent = request.agent(app);
    const reset = await agent.post("/api/auth/reset").send({ token, password: "brand-new-pass" });
    expect(reset.status).toBe(200);
    expect(await whoAmI(agent)).toBe("ana@example.com");
    expect(await whoAmI(oldDevice)).toBeNull();

    const again = await request(app).post("/api/auth/reset").send({ token, password: "another-new-pass" });
    expect(again.status).toBe(400);
    const login = await request(app).post("/api/auth/login").send({ email: "ana@example.com", password: "brand-new-pass" });
    expect(login.status).toBe(200);
  });

  it("refuses state-changing requests from foreign origins", async () => {
    const { app } = makeDeps();
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "ana@example.com", password: "correct-horse" });
    expect(res.status).toBe(403);
  });

  it("changes the password from account settings", async () => {
    const { app } = makeDeps();
    const agent = await signUp(app);
    const bad = await agent.post("/api/account/password").send({ currentPassword: "nope-nope", newPassword: "next-password" });
    expect(bad.status).toBe(400);
    const ok = await agent.post("/api/account/password").send({ currentPassword: "correct-horse", newPassword: "next-password" });
    expect(ok.status).toBe(204);
    expect(await whoAmI(agent)).toBe("ana@example.com");
  });
});
