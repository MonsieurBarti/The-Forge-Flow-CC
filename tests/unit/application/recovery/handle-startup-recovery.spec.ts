// tests/unit/application/recovery/handle-startup-recovery.spec.ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleStartupRecovery } from "../../../../src/application/recovery/handle-startup-recovery.js";
import { writeRecoveryMarker } from "../../../../src/application/recovery/recovery-marker.js";

let repo: string;
let home: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "tff-hsr-"));
  home = join(repo, ".tff-cc");
  mkdirSync(home, { recursive: true });
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("handleStartupRecovery", () => {
  it("runs recovery successfully and returns threw: false when no marker exists", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const result = await handleStartupRecovery({
      homeDir: home,
      recover: async () => ({ cleanedTmps: 0, cleanedLocks: 0 }),
    });
    expect(result.threw).toBe(false);
    expect(stderr).not.toHaveBeenCalled();
  });

  it("prints the cleanup line only when something was cleaned", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await handleStartupRecovery({
      homeDir: home,
      recover: async () => ({ cleanedTmps: 2, cleanedLocks: 1 }),
    });
    const calls = stderr.mock.calls.map((c) => String(c[0])).join("");
    expect(calls).toContain("recovered 2 stale tmp files, 1 stale locks");
  });

  it("on recover throw: writes marker, appends event, prints warning", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const result = await handleStartupRecovery({
      homeDir: home,
      recover: async () => {
        throw new Error("disk on fire");
      },
    });
    expect(result.threw).toBe(true);
    const calls = stderr.mock.calls.map((c) => String(c[0])).join("");
    expect(calls).toContain("tff: orphan recovery skipped — run /tff:health to diagnose");
    expect(readFileSync(join(home, ".recovery-marker"), "utf-8")).toContain("disk on fire");
    expect(readFileSync(join(home, "recovery-events.jsonl"), "utf-8")).toContain("recovery-failed");
  });

  it("replays the stderr warning on follow-up runs when marker exists and recover succeeds", async () => {
    await writeRecoveryMarker(home, new Error("prior"));
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const result = await handleStartupRecovery({
      homeDir: home,
      recover: async () => ({ cleanedTmps: 0, cleanedLocks: 0 }),
    });
    expect(result.threw).toBe(false);
    const calls = stderr.mock.calls.map((c) => String(c[0])).join("");
    expect(calls).toContain("tff: orphan recovery skipped — run /tff:health to diagnose");
  });

  it("does not replay the warning when recover throws this run (only one warning total)", async () => {
    await writeRecoveryMarker(home, new Error("prior"));
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await handleStartupRecovery({
      homeDir: home,
      recover: async () => {
        throw new Error("again");
      },
    });
    const warnings = stderr.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => s.includes("tff: orphan recovery skipped"));
    expect(warnings).toHaveLength(1);
  });
});
