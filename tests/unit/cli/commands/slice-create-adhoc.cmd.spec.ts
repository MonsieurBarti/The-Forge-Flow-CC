import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { createClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

// Git environment variables that can leak between tests and main repo.
const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

describe("slice:create — kind-aware (quick/debug)", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-slice-create-adhoc-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-adhoc-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		originalGitEnv = {};
		for (const key of GIT_ENV_VARS) {
			originalGitEnv[key] = process.env[key];
			delete process.env[key];
		}

		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		// Real git repo so rev-parse / check-ref-format work.
		execSync("git init --initial-branch=main --quiet", { cwd: tmpDir });
		execSync(
			'git -c user.email=t@t.invalid -c user.name=t commit --allow-empty -m "init" --quiet',
			{ cwd: tmpDir },
		);

		await projectInitCmd(["--name", "test-project", "--vision", "Test"]);
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

	// 2. Ad-hoc quick creation
	it("creates a Q-01 quick slice with --kind quick --base-branch main", async () => {
		const result = JSON.parse(
			await sliceCreateCmd(["--title", "Quick fix", "--kind", "quick", "--base-branch", "main"]),
		);
		expect(result.ok).toBe(true);
		const slice = result.data?.slice;
		expect(slice.kind).toBe("quick");
		expect(slice.milestoneId).toBeUndefined();
		expect(slice.baseBranch).toBe("main");
		expect(slice.branchName).toBeUndefined();
		expect(slice.number).toBe(1);

		// PLAN.md exists at .tff-cc/quick/Q-01/PLAN.md
		expect(existsSync(path.join(tmpDir, ".tff-cc", "quick", "Q-01", "PLAN.md"))).toBe(true);

		// STATE.md not touched (no milestone-bound slice exists in this repo).
		expect(existsSync(path.join(tmpDir, ".tff-cc", "STATE.md"))).toBe(false);
	});

	// 3. Ad-hoc debug creation
	it("creates a D-01 debug slice", async () => {
		const result = JSON.parse(
			await sliceCreateCmd(["--title", "Debug crash", "--kind", "debug", "--base-branch", "main"]),
		);
		expect(result.ok).toBe(true);
		const slice = result.data?.slice;
		expect(slice.kind).toBe("debug");
		expect(slice.number).toBe(1);
		expect(existsSync(path.join(tmpDir, ".tff-cc", "debug", "D-01", "PLAN.md"))).toBe(true);
	});

	// 4. Counter increments per kind, milestone numbering uncoupled
	it("numbers ad-hoc slices independently per kind, isolated from milestone slices", async () => {
		// Create milestone + milestone-bound slice → M01-S01.
		const ms = JSON.parse(await milestoneCreateCmd(["--name", "M1"]));
		expect(ms.ok).toBe(true);
		const ms1 = JSON.parse(await sliceCreateCmd(["--title", "MS slice", "--milestone-id", "M01"]));
		expect(ms1.ok).toBe(true);
		expect(ms1.data.slice.number).toBe(1);

		// Two quicks → Q-01, Q-02.
		const q1 = JSON.parse(
			await sliceCreateCmd(["--title", "q1", "--kind", "quick", "--base-branch", "main"]),
		);
		const q2 = JSON.parse(
			await sliceCreateCmd(["--title", "q2", "--kind", "quick", "--base-branch", "main"]),
		);
		expect(q1.ok && q2.ok).toBe(true);
		expect(q1.data.slice.number).toBe(1);
		expect(q2.data.slice.number).toBe(2);

		// Milestone slice numbering not affected by quick counter.
		const ms2 = JSON.parse(await sliceCreateCmd(["--title", "MS2", "--milestone-id", "M01"]));
		expect(ms2.ok).toBe(true);
		expect(ms2.data.slice.number).toBe(2);
	});

	// 5a. Validation: --kind quick without --base-branch
	it("rejects --kind quick without --base-branch (base_branch.required)", async () => {
		const result = JSON.parse(await sliceCreateCmd(["--title", "x", "--kind", "quick"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		const v = result.error.context?.violations?.[0];
		expect(v?.code).toBe("base_branch.required");
	});

	// 5b. Validation: nonexistent base branch
	it("rejects --base-branch nonexistent-branch (base_branch.not_found)", async () => {
		const result = JSON.parse(
			await sliceCreateCmd([
				"--title",
				"x",
				"--kind",
				"quick",
				"--base-branch",
				"nonexistent-branch",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		expect(result.error.context?.violations?.[0]?.code).toBe("base_branch.not_found");
	});

	// 5c. Validation: invalid branch name format
	it("rejects --branch with invalid format (branch.invalid_format)", async () => {
		const result = JSON.parse(
			await sliceCreateCmd([
				"--title",
				"x",
				"--kind",
				"quick",
				"--base-branch",
				"main",
				"--branch",
				"bad name with spaces",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		expect(result.error.context?.violations?.[0]?.code).toBe("branch.invalid_format");
	});

	// 5d. Validation: branch collision
	it("rejects --branch when the branch already exists locally (branch.collision)", async () => {
		// `main` exists already (initial commit on main).
		const result = JSON.parse(
			await sliceCreateCmd([
				"--title",
				"x",
				"--kind",
				"quick",
				"--base-branch",
				"main",
				"--branch",
				"main",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		expect(result.error.context?.violations?.[0]?.code).toBe("branch.collision");
	});

	// 5e. Validation: --kind quick with --milestone-id
	it("rejects --kind quick with --milestone-id (mutually exclusive)", async () => {
		// Need a milestone for M01 to resolve at all — but the check happens before.
		const result = JSON.parse(
			await sliceCreateCmd([
				"--title",
				"x",
				"--kind",
				"quick",
				"--base-branch",
				"main",
				"--milestone-id",
				"M01",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		expect(result.error.context?.violations?.[0]?.code).toBe("milestone_id.unexpected");
	});

	// 6. Custom branch name persisted
	it("persists --branch as branchName on the slice", async () => {
		const result = JSON.parse(
			await sliceCreateCmd([
				"--title",
				"x",
				"--kind",
				"quick",
				"--base-branch",
				"main",
				"--branch",
				"monsieurbarti/tff-42-fix",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.slice.branchName).toBe("monsieurbarti/tff-42-fix");

		// Double-check via store.
		const stores = createClosableStateStores();
		const found = stores.sliceStore.getSlice(result.data.slice.id);
		stores.close();
		expect(found.ok).toBe(true);
		if (found.ok && found.data) {
			expect(found.data.branchName).toBe("monsieurbarti/tff-42-fix");
			expect(found.data.baseBranch).toBe("main");
		}
	});
});
