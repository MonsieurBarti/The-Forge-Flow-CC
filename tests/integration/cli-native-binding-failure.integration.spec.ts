// tests/integration/cli-native-binding-failure.integration.spec.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = join(process.cwd(), "dist/cli/index.js");
const PREBUILT = `better_sqlite3.${process.platform}-${process.arch}.node`;
// Build emits the prebuilt next to every module that imports it, so both
// copies must be stashed for the bundle to miss the prebuilt candidate.
const PREBUILT_PATHS = [
  join(process.cwd(), "dist/cli", PREBUILT),
  join(process.cwd(), "dist/infrastructure/adapters/sqlite", PREBUILT),
];
const prebuiltExists = PREBUILT_PATHS.every((p) => existsSync(p));

let repo: string;
const moved: string[] = [];

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "tff-nbf-"));
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  while (moved.length > 0) {
    const stashed = moved.pop();
    if (!stashed) continue;
    const original = stashed.replace(/\.stashed-by-test$/, "");
    renameSync(stashed, original);
  }
});

describe("CLI emits structured JSON when native binding fails", () => {
  it.skipIf(!prebuiltExists)(
    "exits 1 with code NATIVE_BINDING_FAILED when no binding loads",
    () => {
      for (const p of PREBUILT_PATHS) {
        const stashed = `${p}.stashed-by-test`;
        renameSync(p, stashed);
        moved.push(stashed);
      }

      const out = spawnSync("node", [CLI, "slice:list"], {
        cwd: repo,
        env: { ...process.env, NODE_PATH: "" },
        encoding: "utf-8",
        timeout: 30_000,
      });
      expect(out.status).toBe(1);
      const payload = JSON.parse(out.stdout);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("NATIVE_BINDING_FAILED");
      expect(payload.error.details.platform).toBe(process.platform);
      expect(payload.error.details.arch).toBe(process.arch);
      expect(payload.error.details.nodeAbi).toBe(process.versions.modules);
      expect(Array.isArray(payload.error.details.candidates)).toBe(true);
      expect(payload.error.details.remediation).toContain("bun install --force better-sqlite3");
    },
  );
});
