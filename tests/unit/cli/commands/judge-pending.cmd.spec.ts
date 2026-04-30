import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { judgePendingClearCmd } from "../../../../src/cli/commands/judge-pending-clear.cmd.js";
import { judgePendingListCmd } from "../../../../src/cli/commands/judge-pending-list.cmd.js";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { createClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

describe("judge:pending CLI", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-judge-pending-"));
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

		await projectInitCmd(["--name", "test-project", "--vision", "v"]);
		await milestoneCreateCmd(["--name", "Test Milestone"]);
		await sliceCreateCmd(["--title", "Slice One"]);

		// Seed pending row for M01-S01.
		const stores = createClosableStateStores();
		const sliceRes = stores.sliceStore.getSliceByNumbers(1, 1);
		if (!sliceRes.ok || !sliceRes.data) throw new Error("seeded slice missing");
		stores.pendingJudgmentStore.insertPending(sliceRes.data.id);
		stores.close();
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

	it("judge:pending:list returns the seeded pending row with labels", async () => {
		const out = JSON.parse(await judgePendingListCmd([]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
		expect(out.data.pending[0].slice_label).toBe("M01-S01");
		expect(out.data.pending[0].milestone_label).toBe("M01");
	});

	it("judge:pending:list filters by --milestone-id", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--milestone-id", "M01"]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
	});

	it("judge:pending:list returns NOT_FOUND for unknown milestone", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--milestone-id", "M99"]));
		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("NOT_FOUND");
	});

	it("judge:pending:clear removes the row", async () => {
		const cleared = JSON.parse(await judgePendingClearCmd(["--slice-id", "M01-S01"]));
		expect(cleared.ok).toBe(true);

		const out = JSON.parse(await judgePendingListCmd([]));
		expect(out.data.count).toBe(0);
	});

	it("judge:pending:clear is a no-op when slice has no pending row", async () => {
		await judgePendingClearCmd(["--slice-id", "M01-S01"]);
		const second = JSON.parse(await judgePendingClearCmd(["--slice-id", "M01-S01"]));
		expect(second.ok).toBe(true);
	});
});

describe("judge:pending:list — kind-aware (ad-hoc slices)", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-judge-adhoc-"));
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

		// Real git repo for slice-create --kind quick (it uses git rev-parse).
		execSync("git init --initial-branch=main --quiet", { cwd: tmpDir });
		execSync(
			'git -c user.email=t@t.invalid -c user.name=t commit --allow-empty -m "init" --quiet',
			{ cwd: tmpDir },
		);

		await projectInitCmd(["--name", "p", "--vision", "v"]);
		// One milestone-bound slice: M01-S01.
		await milestoneCreateCmd(["--name", "M1"]);
		await sliceCreateCmd(["--title", "Milestone slice"]);
		// One ad-hoc quick slice: Q-01.
		await sliceCreateCmd(["--title", "Quick fix", "--kind", "quick", "--base-branch", "main"]);
		// One ad-hoc debug slice: D-01.
		await sliceCreateCmd(["--title", "Debug crash", "--kind", "debug", "--base-branch", "main"]);

		// Seed pending-judgment rows for all three slices.
		const stores = createClosableStateStores();
		const all = stores.sliceStore.listSlices();
		if (!all.ok) throw new Error("listSlices failed");
		for (const s of all.data) {
			stores.pendingJudgmentStore.insertPending(s.id);
		}
		stores.close();
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

	it("returns all three pendings (milestone + quick + debug) with no filter", async () => {
		const out = JSON.parse(await judgePendingListCmd([]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(3);
		const labels = out.data.pending.map((p: { slice_label: string }) => p.slice_label).sort();
		expect(labels).toEqual(["D-01", "M01-S01", "Q-01"]);
		const kinds = out.data.pending.map((p: { slice_kind: string }) => p.slice_kind).sort();
		expect(kinds).toEqual(["debug", "milestone", "quick"]);
	});

	it("--kind quick returns only the Q-01 pending", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--kind", "quick"]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
		expect(out.data.pending[0].slice_label).toBe("Q-01");
		expect(out.data.pending[0].slice_kind).toBe("quick");
		expect(out.data.pending[0].milestone_id).toBeNull();
		expect(out.data.pending[0].milestone_label).toBeNull();
	});

	it("--kind debug returns only the D-01 pending", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--kind", "debug"]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
		expect(out.data.pending[0].slice_label).toBe("D-01");
		expect(out.data.pending[0].slice_kind).toBe("debug");
	});

	it("--kind milestone returns only milestone-bound pendings", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--kind", "milestone"]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
		expect(out.data.pending[0].slice_label).toBe("M01-S01");
	});

	it("--milestone-id filters to that milestone's pendings only", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--milestone-id", "M01"]));
		expect(out.ok).toBe(true);
		expect(out.data.count).toBe(1);
		expect(out.data.pending[0].slice_label).toBe("M01-S01");
	});

	it("rejects --milestone-id combined with --kind quick", async () => {
		const out = JSON.parse(await judgePendingListCmd(["--milestone-id", "M01", "--kind", "quick"]));
		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("VALIDATION_ERROR");
	});
});
