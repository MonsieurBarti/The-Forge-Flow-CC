// tests/integration/cli-recovery-marker-replay.integration.spec.ts
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let repo: string;
let home: string;
const CLI = join(process.cwd(), "dist/cli/index.js");

const projectId = "b2c3d4e5-f6a7-4890-bcde-f01234567890";

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-replay-"));
	home = mkdtempSync(join(tmpdir(), "tff-replay-home-"));

	execFileSync("git", ["init", "-b", "feature/x"], { cwd: repo });
	execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
	execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
	execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });

	writeFileSync(join(repo, ".tff-project-id"), `${projectId}\n`);
	mkdirSync(join(home, projectId), { recursive: true });
});
afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
	rmSync(home, { recursive: true, force: true });
});

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
		writeFileSync(join(home, projectId, ".recovery-marker"), JSON.stringify(marker));

		const result = spawnSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			env: { ...process.env, TFF_CC_HOME: home },
			timeout: 30_000,
			encoding: "utf-8",
		});
		expect(result.status).toBe(0);
		expect(result.stderr).toContain("tff: orphan recovery skipped — run /tff:health to diagnose");
	});
});
