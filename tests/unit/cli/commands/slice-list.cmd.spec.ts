import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { sliceListCmd } from "../../../../src/cli/commands/slice-list.cmd.js";

const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

describe("slice:list — kind-aware filtering", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-slice-list-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-list-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		originalGitEnv = {};
		for (const key of GIT_ENV_VARS) {
			originalGitEnv[key] = process.env[key];
			delete process.env[key];
		}

		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		execSync("git init --initial-branch=main --quiet", { cwd: tmpDir });
		execSync(
			'git -c user.email=t@t.invalid -c user.name=t commit --allow-empty -m "init" --quiet',
			{ cwd: tmpDir },
		);

		await projectInitCmd(["--name", "test-project", "--vision", "Test"]);

		// Build fixture: milestone + 1 milestone slice + 2 quicks + 1 debug.
		await milestoneCreateCmd(["--name", "M1"]);
		await sliceCreateCmd(["--title", "MS slice", "--milestone-id", "M01"]);
		await sliceCreateCmd(["--title", "q1", "--kind", "quick", "--base-branch", "main"]);
		await sliceCreateCmd(["--title", "q2", "--kind", "quick", "--base-branch", "main"]);
		await sliceCreateCmd(["--title", "d1", "--kind", "debug", "--base-branch", "main"]);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) delete process.env.TFF_CC_HOME;
		else process.env.TFF_CC_HOME = originalTffCcHome;
		for (const key of GIT_ENV_VARS) {
			if (originalGitEnv[key] === undefined) delete process.env[key];
			else process.env[key] = originalGitEnv[key];
		}
		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("--kind quick returns only quick slices", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "quick"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(2);
		for (const s of result.data) expect(s.kind).toBe("quick");
	});

	it("--kind debug returns only debug slices", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "debug"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("debug");
	});

	it("--kind milestone returns only milestone-bound slices", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "milestone"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("milestone");
	});

	it("--kind quick --milestone-id M01 returns VALIDATION_ERROR", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "quick", "--milestone-id", "M01"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("VALIDATION_ERROR");
	});

	it("no flags returns all slices (existing behavior)", async () => {
		const result = JSON.parse(await sliceListCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(4);
	});

	it("--milestone-id M01 still filters by milestone (existing behavior)", async () => {
		const result = JSON.parse(await sliceListCmd(["--milestone-id", "M01"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("milestone");
	});
});
