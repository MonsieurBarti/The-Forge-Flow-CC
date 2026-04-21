// tests/integration/cli-recovery-marker-replay.integration.spec.ts
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let repo: string;
const CLI = join(process.cwd(), "dist/cli/index.js");

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-replay-"));
	execFileSync("git", ["init", "-b", "feature/x"], { cwd: repo });
	execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
	execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
	execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
	mkdirSync(join(repo, ".tff-cc"), { recursive: true });
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("CLI replays warning when recovery marker is present", () => {
	it("prints warning to stderr on any subsequent invocation", () => {
		const marker = {
			timestamp: new Date().toISOString(),
			errorMessage: "prior failure",
			errorStack: "Error: prior failure",
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
		};
		writeFileSync(join(repo, ".tff-cc", ".recovery-marker"), JSON.stringify(marker));

		const result = spawnSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			timeout: 30_000,
			encoding: "utf-8",
		});
		expect(result.status).toBe(0);
		expect(result.stderr).toContain("tff: orphan recovery skipped — run /tff:health to diagnose");
	});
});
