import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resumeSlice } from "../../src/application/resume/resume-slice.js";
import { checkpointSaveCmd } from "../../src/cli/commands/checkpoint-save.cmd.js";
import { milestoneCreateCmd } from "../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../src/cli/commands/slice-create.cmd.js";
import { taskClaimCmd } from "../../src/cli/commands/task-claim.cmd.js";
import { taskCloseCmd } from "../../src/cli/commands/task-close.cmd.js";
import { MarkdownArtifactAdapter } from "../../src/infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { JsonlJournalAdapter } from "../../src/infrastructure/adapters/journal/jsonl-journal.adapter.js";
import { createClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("journal T1 crash recovery integration", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-journal-recovery-test-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;
		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		// Initialize project
		const initResult = JSON.parse(
			await projectInitCmd(["recovery-test-project", "Test crash recovery"]),
		);
		expect(initResult.ok).toBe(true);

		// Create milestone M01
		const milestoneResult = JSON.parse(await milestoneCreateCmd(["Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);

		// Create slice S01
		const sliceResult = JSON.parse(await sliceCreateCmd(["Test Slice"]));
		expect(sliceResult.ok).toBe(true);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("recovers correctly after crash mid-wave-1", async () => {
		// Set up: Create tasks T01 (wave 0), T02 (wave 1), T03 (wave 1, depends T02)
		const stores = createClosableStateStores();

		// T01: wave 0
		const t01Result = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Task 01 - Wave 0",
			wave: 0,
		});
		expect(t01Result.ok).toBe(true);

		// T02: wave 1
		const t02Result = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 2,
			title: "Task 02 - Wave 1",
			wave: 1,
		});
		expect(t02Result.ok).toBe(true);

		// T03: wave 1, depends on T02
		const t03Result = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 3,
			title: "Task 03 - Wave 1",
			wave: 1,
		});
		expect(t03Result.ok).toBe(true);

		// Add dependency: T03 depends on T02
		const depResult = stores.dependencyStore.addDependency("M01-S01-T03", "M01-S01-T02", "blocks");
		expect(depResult.ok).toBe(true);

		// Execute wave 0: Claim and close T01 (writes journal + checkpoint)
		const claimT01Result = JSON.parse(await taskClaimCmd(["M01-S01-T01", "agent-1"]));
		expect(claimT01Result.ok).toBe(true);

		const closeT01Result = JSON.parse(await taskCloseCmd(["M01-S01-T01"]));
		expect(closeT01Result.ok).toBe(true);

		// Verify T01 is closed
		const t01AfterClose = stores.taskStore.getTask("M01-S01-T01");
		expect(t01AfterClose.ok && t01AfterClose.data?.status).toBe("closed");

		// Save checkpoint after wave 0 completes
		const checkpointData = {
			sliceId: "M01-S01",
			baseCommit: "abc123",
			currentWave: 1, // Moving to wave 1
			completedWaves: [0],
			completedTasks: ["M01-S01-T01"],
			executorLog: [{ taskRef: "M01-S01-T01", agent: "agent-1" }],
		};
		const checkpointResult = JSON.parse(await checkpointSaveCmd([JSON.stringify(checkpointData)]));
		expect(checkpointResult.ok).toBe(true);

		// Verify checkpoint file exists
		const checkpointPath = path.join(
			tmpDir,
			".tff",
			"milestones",
			"M01",
			"slices",
			"M01-S01",
			"CHECKPOINT.md",
		);
		expect(existsSync(checkpointPath)).toBe(true);

		// Start wave 1: Claim T02 (writes task-started to journal)
		const claimT02Result = JSON.parse(await taskClaimCmd(["M01-S01-T02", "agent-2"]));
		expect(claimT02Result.ok).toBe(true);

		// Verify T02 is now in-progress
		const t02AfterClaim = stores.taskStore.getTask("M01-S01-T02");
		expect(t02AfterClaim.ok && t02AfterClaim.data?.status).toBe("in_progress");

		// Verify journal has entries
		const journalPath = path.join(tmpDir, ".tff", "journal", "M01-S01.jsonl");
		expect(existsSync(journalPath)).toBe(true);
		const journalContentBefore = readFileSync(journalPath, "utf-8");
		const entriesBefore = journalContentBefore
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(entriesBefore).toHaveLength(3); // task-started T01, task-completed T01, task-started T02

		// Simulate crash: Close all stores AND remove SQLite state file
		// (journal and checkpoint files are persisted, but in-memory state is lost)
		stores.close();
		const stateDbPath = path.join(tmpDir, ".tff", "state.db");
		if (existsSync(stateDbPath)) {
			rmSync(stateDbPath);
		}

		// Create fresh stores (simulating new process after crash)
		const freshStores = createClosableStateStores();

		// Resume: Call resume use case with fresh artifact store and journal
		const artifactStore = new MarkdownArtifactAdapter(tmpDir);
		const journal = new JsonlJournalAdapter(path.join(tmpDir, ".tff", "journal"));

		const resumeResult = await resumeSlice({ sliceId: "M01-S01" }, { artifactStore, journal });

		// Assert resume succeeded
		expect(resumeResult.ok).toBe(true);
		if (!resumeResult.ok) {
			throw new Error(`Resume failed: ${resumeResult.error.message}`);
		}

		const resume = resumeResult.data;

		// Assert: resumeFromWave === 1 (resume at wave 1, not wave 0)
		expect(resume.resumeFromWave).toBe(1);

		// Assert: completedTaskIds contains 'T01'
		expect(resume.completedTaskIds).toContain("M01-S01-T01");

		// Assert: T01 would be skipped if we resumed execution
		expect(resume.skipTasks).toContain("M01-S01-T01");

		// Assert: checkpoint data is loaded correctly
		expect(resume.checkpoint.sliceId).toBe("M01-S01");
		expect(resume.checkpoint.currentWave).toBe(1);
		expect(resume.checkpoint.completedTasks).toContain("M01-S01-T01");

		// Assert: journal and checkpoint are consistent
		expect(resume.consistent).toBe(true);

		// Assert: lastProcessedSeq is correct (should be 2, index of last entry)
		expect(resume.lastProcessedSeq).toBe(2);

		// Verify journal content is still intact after crash
		const journalContentAfter = readFileSync(journalPath, "utf-8");
		const entriesAfter = journalContentAfter
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(entriesAfter).toHaveLength(3);

		// Verify entry types and order
		expect(entriesAfter[0]).toMatchObject({ type: "task-started", taskId: "M01-S01-T01" });
		expect(entriesAfter[1]).toMatchObject({ type: "task-completed", taskId: "M01-S01-T01" });
		expect(entriesAfter[2]).toMatchObject({ type: "task-started", taskId: "M01-S01-T02" });

		// After crash (SQLite deleted), task store is empty - tasks would be recreated from slice plan
		// The important thing is resume use case correctly identifies what was completed
		const t02InFreshStore = freshStores.taskStore.getTask("M01-S01-T02");
		expect(t02InFreshStore.ok && t02InFreshStore.data).toBeNull(); // Task doesn't exist in fresh store

		// Clean up fresh stores
		freshStores.close();
	});

	it("resumes from wave 0 when no tasks completed", async () => {
		// Set up: Create task T01 (wave 0)
		const stores = createClosableStateStores();

		const t01Result = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Task 01 - Wave 0",
			wave: 0,
		});
		expect(t01Result.ok).toBe(true);

		// Save checkpoint at wave 0 (no completed tasks)
		const checkpointData = {
			sliceId: "M01-S01",
			baseCommit: "abc123",
			currentWave: 0,
			completedWaves: [],
			completedTasks: [],
			executorLog: [],
		};
		const checkpointResult = JSON.parse(await checkpointSaveCmd([JSON.stringify(checkpointData)]));
		expect(checkpointResult.ok).toBe(true);

		// Empty journal (no task activity)

		// Simulate crash
		stores.close();

		// Resume
		const artifactStore = new MarkdownArtifactAdapter(tmpDir);
		const journal = new JsonlJournalAdapter(path.join(tmpDir, ".tff", "journal"));

		const resumeResult = await resumeSlice({ sliceId: "M01-S01" }, { artifactStore, journal });

		expect(resumeResult.ok).toBe(true);
		if (!resumeResult.ok) return;

		// Should resume from wave 0
		expect(resumeResult.data.resumeFromWave).toBe(0);
		expect(resumeResult.data.completedTaskIds).toHaveLength(0);
		expect(resumeResult.data.consistent).toBe(true);
	});

	it("fails resume when checkpoint is missing", async () => {
		const artifactStore = new MarkdownArtifactAdapter(tmpDir);
		const journal = new JsonlJournalAdapter(path.join(tmpDir, ".tff", "journal"));

		const resumeResult = await resumeSlice({ sliceId: "M01-S01" }, { artifactStore, journal });

		expect(resumeResult.ok).toBe(false);
		if (resumeResult.ok) return;

		expect(resumeResult.error.code).toBe("NOT_FOUND");
		expect(resumeResult.error.message).toContain("No checkpoint found");
	});

	it("detects inconsistency when checkpoint claims completed tasks not in journal", async () => {
		// Set up: Create task but don't execute it
		const stores = createClosableStateStores();

		const t01Result = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Task 01",
			wave: 0,
		});
		expect(t01Result.ok).toBe(true);

		// Save checkpoint claiming T01 is completed (but no journal entry)
		const checkpointData = {
			sliceId: "M01-S01",
			baseCommit: "abc123",
			currentWave: 1,
			completedWaves: [0],
			completedTasks: ["M01-S01-T01"], // Claimed but no journal proof
			executorLog: [{ taskRef: "M01-S01-T01", agent: "agent-1" }],
		};
		const checkpointResult = JSON.parse(await checkpointSaveCmd([JSON.stringify(checkpointData)]));
		expect(checkpointResult.ok).toBe(true);

		stores.close();

		// Resume should detect inconsistency
		const artifactStore = new MarkdownArtifactAdapter(tmpDir);
		const journal = new JsonlJournalAdapter(path.join(tmpDir, ".tff", "journal"));

		const resumeResult = await resumeSlice({ sliceId: "M01-S01" }, { artifactStore, journal });

		expect(resumeResult.ok).toBe(false);
		if (resumeResult.ok) return;

		expect(resumeResult.error.code).toBe("JOURNAL_REPLAY_INCONSISTENT");
		expect(resumeResult.error.context?.reason).toBe("empty-journal-nonempty-checkpoint");
	});
});
