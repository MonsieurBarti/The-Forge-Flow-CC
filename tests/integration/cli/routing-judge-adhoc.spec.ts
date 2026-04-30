import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectInitCmd } from "../../../src/cli/commands/project-init.cmd.js";
import { routingJudgePrepareCmd } from "../../../src/cli/commands/routing-judge-prepare.cmd.js";
import { routingJudgeRecordCmd } from "../../../src/cli/commands/routing-judge-record.cmd.js";
import { sliceCreateCmd } from "../../../src/cli/commands/slice-create.cmd.js";
import { createClosableStateStores } from "../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

// Drive an ad-hoc slice (kind=quick) all the way to "closed" status so the
// post-close routing/judge surfaces accept it.
const driveSliceToClosed = (sliceId: string): void => {
	const stores = createClosableStateStores();
	stores.reviewStore.recordReview({
		sliceId,
		reviewer: "plannotator",
		type: "spec",
		verdict: "approved",
		commitSha: "abc",
		createdAt: new Date().toISOString(),
	});
	const taskR = stores.taskStore.createTask({ sliceId, number: 1, title: "T1" });
	if (!taskR.ok) throw new Error("createTask failed");
	stores.taskStore.claimTask(taskR.data.id, "exec");
	for (const target of [
		"researching",
		"planning",
		"executing",
		"verifying",
		"reviewing",
		"completing",
	] as const) {
		stores.sliceStore.transitionSlice(sliceId, target);
	}
	stores.reviewStore.recordReview({
		sliceId,
		reviewer: "rev-code",
		type: "code",
		verdict: "approved",
		commitSha: "abc",
		createdAt: new Date().toISOString(),
	});
	stores.reviewStore.recordReview({
		sliceId,
		reviewer: "rev-sec",
		type: "security",
		verdict: "approved",
		commitSha: "abc",
		createdAt: new Date().toISOString(),
	});
	stores.taskStore.closeTask(taskR.data.id, "done");
	stores.sliceStore.transitionSlice(sliceId, "closed");
	stores.close();
};

const stubDiffReader = {
	readMergeDiff: async () => ({
		ok: true as const,
		data: {
			files_changed: 1,
			insertions: 1,
			deletions: 0,
			patch: "diff...",
			truncated: false,
		},
	}),
};
const stubSpecReader = {
	readSpec: async () => ({
		ok: true as const,
		data: { text: "# spec", truncated: false, missing: false },
	}),
};

describe("routing:judge-prepare / routing:judge-record — ad-hoc slices", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-judge-adhoc-int-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-judge-adhoc-"));
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

		await projectInitCmd(["--name", "p", "--vision", "v"]);

		// Routing + model_judge enabled (settings.yaml goes inside .tff-cc which
		// project-init created/symlinked).
		mkdirSync(path.join(tmpDir, ".tff-cc", "logs"), { recursive: true });
		writeFileSync(
			path.join(tmpDir, ".tff-cc", "settings.yaml"),
			`routing:
  enabled: true
  calibration:
    model_judge:
      enabled: true
`,
		);
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

	it("routing:judge-prepare resolves Q-01 label and base-branch merge target for ad-hoc quick slice", async () => {
		// Create ad-hoc quick slice from main.
		await sliceCreateCmd(["--title", "Quick fix", "--kind", "quick", "--base-branch", "main"]);

		const stores = createClosableStateStores();
		const slices = stores.sliceStore.listSlices();
		if (!slices.ok) throw new Error("listSlices failed");
		const quick = slices.data.find((s) => s.kind === "quick");
		if (!quick) throw new Error("quick slice not found");
		stores.close();
		driveSliceToClosed(quick.id);

		// Seed an unjudged routing decision so prepare reaches the merge-lookup branch.
		const decisionId = "00000000-0000-4000-8000-000000000001";
		writeFileSync(
			path.join(tmpDir, ".tff-cc", "logs", "routing.jsonl"),
			`${JSON.stringify({
				kind: "route",
				timestamp: "2026-04-20T09:00:00.000Z",
				workflow_id: "tff:ship",
				slice_id: "Q-01",
				decision: {
					agent: "reviewer",
					confidence: 0.9,
					signals: { complexity: "medium", risk: { level: "low", tags: [] } },
					fallback_used: false,
					enriched: false,
					decision_id: decisionId,
				},
			})}\n`,
		);

		// Spy on merge-lookup to capture the resolved sliceLabel and mergeBranches.
		const captured: { label: string; branches: string[] }[] = [];
		const spyLookup = {
			findMergeCommit: async (label: string, branches: string[]) => {
				captured.push({ label, branches });
				return { ok: true as const, data: "abc1234567890" };
			},
		};

		const out = await routingJudgePrepareCmd(["--slice", "Q-01"], {
			mergeLookupFactory: () => spyLookup,
			diffReaderFactory: () => stubDiffReader,
			specReaderFactory: () => stubSpecReader,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.slice_label).toBe("Q-01");
		expect(captured.length).toBeGreaterThan(0);
		expect(captured[0].label).toBe("Q-01");
		// Base branch is "main" (slice.baseBranch); default branch also "main"; deduped → ["main"].
		expect(captured[0].branches).toEqual(["main"]);
	});

	it("routing:judge-prepare uses slice baseBranch + main when they differ", async () => {
		// Create branch "feature/x" so we can use it as a base.
		execSync("git branch feature/x", { cwd: tmpDir });
		await sliceCreateCmd([
			"--title",
			"Debug crash",
			"--kind",
			"debug",
			"--base-branch",
			"feature/x",
		]);

		const stores = createClosableStateStores();
		const slices = stores.sliceStore.listSlices();
		if (!slices.ok) throw new Error("listSlices failed");
		const debugSlice = slices.data.find((s) => s.kind === "debug");
		if (!debugSlice) throw new Error("debug slice not found");
		stores.close();
		driveSliceToClosed(debugSlice.id);

		// Seed an unjudged routing decision under D-01 so prepare reaches merge lookup.
		const decisionId = "00000000-0000-4000-8000-000000000002";
		writeFileSync(
			path.join(tmpDir, ".tff-cc", "logs", "routing.jsonl"),
			`${JSON.stringify({
				kind: "route",
				timestamp: "2026-04-20T09:00:00.000Z",
				workflow_id: "tff:ship",
				slice_id: "D-01",
				decision: {
					agent: "reviewer",
					confidence: 0.9,
					signals: { complexity: "medium", risk: { level: "low", tags: [] } },
					fallback_used: false,
					enriched: false,
					decision_id: decisionId,
				},
			})}\n`,
		);

		const captured: { label: string; branches: string[] }[] = [];
		const spyLookup = {
			findMergeCommit: async (label: string, branches: string[]) => {
				captured.push({ label, branches });
				return { ok: true as const, data: "abc" };
			},
		};

		const out = await routingJudgePrepareCmd(["--slice", "D-01"], {
			mergeLookupFactory: () => spyLookup,
			diffReaderFactory: () => stubDiffReader,
			specReaderFactory: () => stubSpecReader,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.slice_label).toBe("D-01");
		expect(captured[0].branches).toEqual(["feature/x", "main"]);
	});

	it("routing:judge-record records under Q-## label for ad-hoc quick slice", async () => {
		await sliceCreateCmd(["--title", "Quick fix 2", "--kind", "quick", "--base-branch", "main"]);

		const stores = createClosableStateStores();
		const slices = stores.sliceStore.listSlices();
		if (!slices.ok) throw new Error("listSlices failed");
		const quick = slices.data.find((s) => s.kind === "quick");
		if (!quick) throw new Error("quick slice not found");
		stores.close();
		driveSliceToClosed(quick.id);

		// Seed a routing decision under the Q-01 label so record finds it.
		const decisionId = "00000000-0000-4000-8000-000000000099";
		writeFileSync(
			path.join(tmpDir, ".tff-cc", "logs", "routing.jsonl"),
			`${JSON.stringify({
				kind: "route",
				timestamp: "2026-04-20T09:00:00.000Z",
				workflow_id: "tff:ship",
				slice_id: "Q-01",
				decision: {
					agent: "reviewer",
					confidence: 0.9,
					signals: { complexity: "medium", risk: { level: "low", tags: [] } },
					fallback_used: false,
					enriched: false,
					decision_id: decisionId,
				},
			})}\n`,
		);

		const verdictsPath = path.join(tmpDir, "verdicts.json");
		writeFileSync(
			verdictsPath,
			JSON.stringify({
				verdicts: [
					{
						decision_id: decisionId,
						dimension: "agent",
						verdict: "ok",
						reason: "looks good",
					},
				],
			}),
		);

		const out = await routingJudgeRecordCmd(["--slice", "Q-01", "--verdicts-path", verdictsPath]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.slice_label).toBe("Q-01");
		expect(parsed.data.outcomes_emitted).toBe(1);

		const lines = readFileSync(
			path.join(tmpDir, ".tff-cc", "logs", "routing-outcomes.jsonl"),
			"utf8",
		)
			.trim()
			.split("\n")
			.filter(Boolean);
		expect(lines).toHaveLength(1);
		const outcome = JSON.parse(lines[0]);
		expect(outcome.source).toBe("model-judge");
		expect(outcome.decision_id).toBe(decisionId);
	});
});
