import type { DestinationStream } from "pino";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLogger } from "../src/logger";
import { createMailer } from "../src/mailer";
import { consumeQuota } from "../src/usage";
import { makeDeps, prisma, resetDb, signUp } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function capture() {
  const lines: string[] = [];
  const stream: DestinationStream = { write: (line: string) => void lines.push(line) };
  return { lines, stream };
}

describe("logging", () => {
  it("censors session cookies and auth headers in request logs", () => {
    const { lines, stream } = capture();
    const logger = createLogger({ env: "production" }, stream);
    logger.info(
      {
        req: { method: "GET", url: "/api/projects", headers: { cookie: "castly_session=secret-token", authorization: "Bearer abc" } },
        res: { statusCode: 200, headers: { "set-cookie": "castly_session=new-secret" } },
      },
      "request completed",
    );
    const out = lines.join("");
    expect(out).not.toContain("secret-token");
    expect(out).not.toContain("new-secret");
    expect(out).not.toContain("Bearer abc");
    expect(out).toContain("[redacted]");
  });

  it("never logs email bodies (reset links) in production without SMTP", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ env: "production" }, stream);
    const mailer = createMailer({ env: "production", smtpUrl: undefined, mailFrom: "x" }, logger);
    await mailer.send({ to: "ana@example.com", subject: "Reset your Castly password", text: "https://castly.app/reset/TOKEN123" });
    const out = lines.join("");
    expect(out).not.toContain("TOKEN123");
    expect(out).not.toContain("ana@example.com");
    expect(out).toContain("SMTP_URL is not set");
  });

  it("still prints the email in development so local resets work", async () => {
    const { lines, stream } = capture();
    const mailer = createMailer({ env: "development", smtpUrl: undefined, mailFrom: "x" }, createLogger({ env: "development" }, stream));
    await mailer.send({ to: "ana@example.com", subject: "Reset", text: "http://localhost:5173/reset/DEVTOKEN" });
    expect(lines.join("")).toContain("DEVTOKEN");
  });
});

describe("daily quotas", () => {
  it("holds the cap when many calls race the check", async () => {
    const user = await prisma.user.create({ data: { email: "race@example.com", name: "Race", passwordHash: "x" } });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => consumeQuota(prisma, user.id, "script", 2)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await prisma.usageEvent.count({ where: { userId: user.id } })).toBe(2);
  });

  it("caps script drafts over HTTP", async () => {
    const { app } = makeDeps({ DAILY_SCRIPT_LIMIT: "1" });
    const agent = await signUp(app);
    const { body } = await agent.post("/api/projects").send({ templateId: "tee" });
    const results = await Promise.all(
      Array.from({ length: 4 }, () => agent.post(`/api/projects/${body.project.id}/script`).send({})),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 429, 429, 429]);
  });
});
