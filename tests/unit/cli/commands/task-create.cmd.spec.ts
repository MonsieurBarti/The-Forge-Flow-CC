import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { taskCreateCmd } from "../../../../src/cli/commands/task-create.cmd.js";

const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

describe("task:create — persists tasks + regenerates STATE.md", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;
	let sliceId: string;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-task-create-test-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		originalGitEnv = {};
		for (const key of GIT_ENV_VARS) {
			originalGitEnv[key] = process.env[key];
			delete process.env[key];
		}

		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		const gitDir = path.join(tmpDir, ".git");
		mkdirSync(gitDir, { recursive: true });
		mkdirSync(path.join(gitDir, "refs", "heads"), { recursive: true });
		mkdirSync(path.join(gitDir, "objects"), { recursive: true });
		writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
		writeFileSync(path.join(gitDir, "config"), "[core]\n\trepositoryformatversion = 0\n");

		await projectInitCmd(["--name", "test-project", "--vision", "A test project"]);
		const milestoneResult = JSON.parse(await milestoneCreateCmd(["--name", "Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);

		const sliceResult = JSON.parse(await sliceCreateCmd(["--title", "Test Slice"]));
		expect(sliceResult.ok).toBe(true);
		if (sliceResult.ok) {
			sliceId = sliceResult.data?.slice?.id;
		}
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		for (const key of GIT_ENV_VARS) {
			if (originalGitEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalGitEnv[key];
			}
		}
		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("creates a task and returns its id + persisted shape", async () => {
		const result = JSON.parse(
			await taskCreateCmd([
				"--slice-id",
				"M01-S01",
				"--number",
				"1",
				"--title",
				"Write failing test",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.task.id).toBe(`${sliceId}-T01`);
		expect(result.data.task.sliceId).toBe(sliceId);
		expect(result.data.task.number).toBe(1);
		expect(result.data.task.title).toBe("Write failing test");
		expect(result.data.task.status).toBe("open");
	});

	it("regenerates STATE.md so Tasks: N/M reflects the new task", async () => {
		const stateFile = path.join(tmpDir, ".tff-cc", "STATE.md");

		// Before: empty slice → 0/0
		const before = readFileSync(stateFile, "utf8");
		expect(before).toContain("- Tasks: 0/0 completed");

		const r1 = JSON.parse(
			await taskCreateCmd(["--slice-id", "M01-S01", "--number", "1", "--title", "First task"]),
		);
		expect(r1.ok).toBe(true);

		const r2 = JSON.parse(
			await taskCreateCmd([
				"--slice-id",
				"M01-S01",
				"--number",
				"2",
				"--title",
				"Second task",
				"--description",
				"AC2",
				"--wave",
				"1",
			]),
		);
		expect(r2.ok).toBe(true);
		expect(r2.data.task.wave).toBe(1);
		expect(r2.data.task.description).toBe("AC2");

		const after = readFileSync(stateFile, "utf8");
		expect(after).toContain("- Tasks: 0/2 completed");
		// Per-slice cell rendered too.
		expect(after).toMatch(/\| 0\/2 \| 0% \|/);
	});

	it("accepts the slice UUID directly", async () => {
		const result = JSON.parse(
			await taskCreateCmd(["--slice-id", sliceId, "--number", "1", "--title", "By UUID"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.task.id).toBe(`${sliceId}-T01`);
	});

	it("fails fast with NOT_FOUND for an unknown slice label", async () => {
		const result = JSON.parse(
			await taskCreateCmd(["--slice-id", "M99-S99", "--number", "1", "--title", "Orphan"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("fails fast with MISSING_REQUIRED_FLAG when title is omitted", async () => {
		const result = JSON.parse(await taskCreateCmd(["--slice-id", "M01-S01", "--number", "1"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
