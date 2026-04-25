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
