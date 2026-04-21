// tests/unit/application/recovery/append-recovery-failed-entry.spec.ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendRecoveryFailedEntry } from "../../../../src/application/recovery/append-recovery-failed-entry.js";

const RECOVERY_EVENTS_FILE = "recovery-events.jsonl";

let repo: string;
let home: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "tff-events-"));
  home = join(repo, ".tff-cc");
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("appendRecoveryFailedEntry", () => {
  it("appends a recovery-failed event when .tff-cc/ exists", async () => {
    mkdirSync(home, { recursive: true });
    await appendRecoveryFailedEntry(home, new Error("boom"));
    const raw = readFileSync(join(home, RECOVERY_EVENTS_FILE), "utf-8");
    const line = raw.trim().split("\n").at(-1) as string;
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.type).toBe("recovery-failed");
    expect(parsed.error).toBe("boom");
    expect(parsed.stack).toBeTypeOf("string");
    expect(typeof parsed.timestamp).toBe("string");
    expect((parsed.context as Record<string, unknown>).platform).toBe(process.platform);
  });

  it("does not create .tff-cc/ when absent (skips append silently)", async () => {
    await appendRecoveryFailedEntry(home, new Error("boom"));
    expect(existsSync(home)).toBe(false);
  });

  it("appends multiple events without truncating prior ones", async () => {
    mkdirSync(home, { recursive: true });
    await appendRecoveryFailedEntry(home, new Error("first"));
    await appendRecoveryFailedEntry(home, new Error("second"));
    const lines = readFileSync(join(home, RECOVERY_EVENTS_FILE), "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  it("swallows internal failures (does not rethrow)", async () => {
    // Make the target an un-writable path by using a non-existent deep parent chain
    // under a file that is not a directory.
    const file = join(repo, "blocker");
    // Create a regular file named 'blocker'; then use that path as home
    // so any mkdir/append against it fails.
    const { writeFileSync } = await import("node:fs");
    writeFileSync(file, "");
    await expect(appendRecoveryFailedEntry(file, new Error("x"))).resolves.toBeUndefined();
  });
});
