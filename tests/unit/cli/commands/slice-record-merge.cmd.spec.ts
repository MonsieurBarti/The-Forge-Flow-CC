import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { sliceRecordMergeCmd } from "../../../../src/cli/commands/slice-record-merge.cmd.js";
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

describe("slice:record-merge CLI", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-record-merge-"));
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

	it("inline --merge-sha + --base-ref records via the pending-judgment store", async () => {
		const out = JSON.parse(
			await sliceRecordMergeCmd([
				"--slice-id",
				"M01-S01",
				"--merge-sha",
				"abc1234",
				"--base-ref",
				"milestone/x",
			]),
		);
		expect(out.ok).toBe(true);
		expect(out.data.merge_sha).toBe("abc1234");
		expect(out.data.base_ref).toBe("milestone/x");

		const stores = createClosableStateStores();
		const sliceRes = stores.sliceStore.getSliceByNumbers(1, 1);
		if (!sliceRes.ok || !sliceRes.data) throw new Error("missing slice");
		const got = stores.pendingJudgmentStore.getPending(sliceRes.data.id);
		stores.close();
		if (!got.ok || !got.data) throw new Error("expected pending row");
		expect(got.data.mergeSha).toBe("abc1234");
		expect(got.data.baseRef).toBe("milestone/x");
	});

	it("--pr resolves merge SHA via injected ghPrView override", async () => {
		const out = JSON.parse(
			await sliceRecordMergeCmd(["--slice-id", "M01-S01", "--pr", "42"], {
				ghPrView: async (pr) => {
					expect(pr).toBe(42);
					return { mergeSha: "deadbeef", baseRef: "milestone/x" };
				},
			}),
		);
		expect(out.ok).toBe(true);
		expect(out.data.merge_sha).toBe("deadbeef");
		expect(out.data.base_ref).toBe("milestone/x");
	});

	it("rejects request with neither --pr nor inline pair", async () => {
		const out = JSON.parse(await sliceRecordMergeCmd(["--slice-id", "M01-S01"]));
		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("PRECONDITION_VIOLATION");
		expect(out.error.context.violations[0].code).toBe("merge-source");
	});

	it("rejects request with only one of --merge-sha / --base-ref", async () => {
		const out = JSON.parse(
			await sliceRecordMergeCmd(["--slice-id", "M01-S01", "--merge-sha", "abc"]),
		);
		expect(out.ok).toBe(false);
		expect(out.error.context.violations[0].code).toBe("merge-sha+base-ref");
	});

	it("surfaces ghPrView failure as gh.pr.view precondition", async () => {
		const out = JSON.parse(
			await sliceRecordMergeCmd(["--slice-id", "M01-S01", "--pr", "42"], {
				ghPrView: async () => {
					throw new Error("PR not merged yet");
				},
			}),
		);
		expect(out.ok).toBe(false);
		expect(out.error.context.violations[0].code).toBe("gh.pr.view");
		expect(out.error.context.violations[0].actual).toContain("PR not merged yet");
	});

	it("upserts: a second record-merge overwrites previous merge_sha + base_ref", async () => {
		await sliceRecordMergeCmd([
			"--slice-id",
			"M01-S01",
			"--merge-sha",
			"old",
			"--base-ref",
			"milestone/x",
		]);
		await sliceRecordMergeCmd([
			"--slice-id",
			"M01-S01",
			"--merge-sha",
			"new",
			"--base-ref",
			"main",
		]);
		const stores = createClosableStateStores();
		const sliceRes = stores.sliceStore.getSliceByNumbers(1, 1);
		if (!sliceRes.ok || !sliceRes.data) throw new Error("missing slice");
		const got = stores.pendingJudgmentStore.getPending(sliceRes.data.id);
		stores.close();
		if (!got.ok || !got.data) throw new Error("expected pending row");
		expect(got.data.mergeSha).toBe("new");
		expect(got.data.baseRef).toBe("main");
	});
});
