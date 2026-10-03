import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://localhost:5432/castly_test";

/** Applies the committed migrations to the test database (non-destructive); tests truncate their own rows. */
export default function setup() {
  if (!/test/i.test(TEST_DATABASE_URL)) {
    throw new Error(`Refusing to run tests against a database whose URL doesn't mention "test": ${TEST_DATABASE_URL}`);
  }
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
