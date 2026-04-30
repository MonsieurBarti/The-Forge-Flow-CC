import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCloseCmd } from "../../../../src/cli/commands/milestone-close.cmd.js";
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

describe("milestone:close — pending-judgment gate", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;
	let sliceUuid: string;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-mclose-"));
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

		await projectInitCmd(["--name", "p", "--vision", "v"]);
		await milestoneCreateCmd(["--name", "M1"]);
		await sliceCreateCmd(["--title", "S1"]);

		const stores = createClosableStateStores();
		const sliceRes = stores.sliceStore.getSliceByNumbers(1, 1);
		if (!sliceRes.ok || !sliceRes.data) throw new Error("seeded slice missing");
		sliceUuid = sliceRes.data.id;
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

	it("blocks close when a slice has a pending judgment", async () => {
		const stores = createClosableStateStores();
		stores.pendingJudgmentStore.insertPending(sliceUuid);
		stores.close();

		const out = JSON.parse(await milestoneCloseCmd(["--milestone-id", "M01"]));
		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("PENDING_JUDGMENTS");
		expect(out.error.context.slices).toEqual(["M01-S01"]);
	});

	it("allows close when no pending judgments remain", async () => {
		// No pending row inserted → gate is satisfied.
		const stores = createClosableStateStores();
		stores.pendingJudgmentStore.clearPending(sliceUuid); // idempotent no-op
		stores.close();

		// Note: the underlying milestone-completeness check (spec approvals on
		// each slice) still applies, so this asserts the gate's verdict, not
		// downstream success. We assert the error is NOT PENDING_JUDGMENTS.
		const out = JSON.parse(await milestoneCloseCmd(["--milestone-id", "M01"]));
		expect(out.error?.code).not.toBe("PENDING_JUDGMENTS");
	});

	it("ignores ad-hoc (quick/debug) pendings when checking the milestone gate", async () => {
		// Set up a real git repo so slice:create --kind quick can autodetect HEAD.
		execSync("git init --initial-branch=main --quiet", { cwd: tmpDir });
		execSync(
			'git -c user.email=t@t.invalid -c user.name=t commit --allow-empty -m "init" --quiet',
			{ cwd: tmpDir },
		);

		// Create an ad-hoc quick slice and seed a pending judgment for it.
		await sliceCreateCmd(["--title", "Quick fix", "--kind", "quick", "--base-branch", "main"]);
		const stores = createClosableStateStores();
		const list = stores.sliceStore.listSlicesByKind("quick");
		if (!list.ok) throw new Error("listSlicesByKind failed");
		const quick = list.data[0];
		stores.pendingJudgmentStore.insertPending(quick.id);
		// Milestone slice has NO pending → gate should be satisfied for the milestone.
		stores.close();

		// milestone:close should NOT be blocked by the ad-hoc pending. Since
		// downstream completeness checks (spec approval / open slices) still
		// apply, we only assert the verdict is NOT PENDING_JUDGMENTS.
		const out = JSON.parse(await milestoneCloseCmd(["--milestone-id", "M01"]));
		expect(out.error?.code).not.toBe("PENDING_JUDGMENTS");
	});

	it("writes a routing scorecard JSON when close succeeds and routing is enabled", async () => {
		// Drive slice to closed via the spec-approval + close path so milestone
		// can close. Reuse the same store the rest of the suite uses.
		const stores = createClosableStateStores();
		stores.reviewStore.recordReview({
			sliceId: sliceUuid,
			reviewer: "plannotator",
			type: "spec",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		// Seed a task so the close transition can pass tasks-closed precondition.
		const taskR = stores.taskStore.createTask({
			sliceId: sliceUuid,
			number: 1,
			title: "T1",
		});
		if (!taskR.ok) throw new Error("createTask failed");
		stores.taskStore.claimTask(taskR.data.id, "exec");
		// Drive slice through the chain.
		for (const target of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			stores.sliceStore.transitionSlice(sliceUuid, target);
		}
		stores.reviewStore.recordReview({
			sliceId: sliceUuid,
			reviewer: "rev-code",
			type: "code",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		stores.reviewStore.recordReview({
			sliceId: sliceUuid,
			reviewer: "rev-sec",
			type: "security",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		// Mark task closed via the store.
		stores.taskStore.closeTask(taskR.data.id, "done");
		stores.sliceStore.transitionSlice(sliceUuid, "closed");
		// Drain the pending judgment that slice-close enqueued.
		stores.pendingJudgmentStore.clearPending(sliceUuid);
		stores.close();

		// Enable routing so the scorecard branch runs.
		const settingsDir = path.join(tmpDir, ".tff-cc");
		mkdirSync(settingsDir, { recursive: true });
		writeFileSync(
			path.join(settingsDir, "settings.yaml"),
			"routing:\n  enabled: true\n  logging:\n    path: .tff-cc/logs/routing.jsonl\n",
		);

		const out = JSON.parse(await milestoneCloseCmd(["--milestone-id", "M01"]));
		expect(out.ok).toBe(true);
		const scorecardPath = out.data.scorecard_path;
		expect(scorecardPath).toBeTruthy();
		expect(existsSync(scorecardPath)).toBe(true);
		const sc = JSON.parse(readFileSync(scorecardPath, "utf8"));
		expect(sc.milestone_label).toBe("M01");
		expect(sc.slice_labels).toEqual(["M01-S01"]);
		expect(sc.decision_count).toBe(0);
		expect(sc.agreement_rate).toBe(1);
	});
});
