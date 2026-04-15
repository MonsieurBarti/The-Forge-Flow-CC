import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { taskClaimCmd } from "../../../../src/cli/commands/task-claim.cmd.js";
import { taskCloseCmd } from "../../../../src/cli/commands/task-close.cmd.js";
import { createClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("task:close — journal integration", () => {
	let tmpDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-close-test-"));
		originalCwd = process.cwd();
		process.chdir(tmpDir);

		// Initialize project
		await projectInitCmd(["test-project", "A test project"]);

		// Create milestone (auto-numbered as M01)
		const milestoneResult = JSON.parse(await milestoneCreateCmd(["Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);

		// Create slice (auto-numbered as S01 under M01)
		const sliceResult = JSON.parse(await sliceCreateCmd(["Test Slice"]));
		expect(sliceResult.ok).toBe(true);

		// Create task directly via store
		const stores = createClosableStateStores();
		const taskResult = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Test Task",
		});
		stores.close();
		expect(taskResult.ok).toBe(true);

		// Claim the task first (required before closing)
		const claimResult = JSON.parse(await taskClaimCmd(["M01-S01-T01", "test-agent"]));
		expect(claimResult.ok).toBe(true);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("writes task-completed journal entry before closing task", async () => {
		const journalPath = path.join(tmpDir, ".tff", "journal", "M01-S01.jsonl");

		// Close the task
		const result = JSON.parse(await taskCloseCmd(["M01-S01-T01"]));
		expect(result.ok).toBe(true);

		// Verify journal file exists and contains both entries
		expect(existsSync(journalPath)).toBe(true);
		const journalContent = readFileSync(journalPath, "utf-8");
		const entries = journalContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		expect(entries).toHaveLength(2);

		// First entry should be task-started from beforeEach
		expect(entries[0]).toMatchObject({
			type: "task-started",
			sliceId: "M01-S01",
			taskId: "M01-S01-T01",
		});

		// Second entry should be task-completed
		expect(entries[1]).toMatchObject({
			type: "task-completed",
			sliceId: "M01-S01",
			taskId: "M01-S01-T01",
			waveIndex: 0,
			durationMs: 0,
		});
		expect(entries[1].seq).toBe(1);
		expect(entries[1].timestamp).toBeDefined();
	});

	it("accepts optional reason parameter", async () => {
		// Close with reason
		const result = JSON.parse(
			await taskCloseCmd(["M01-S01-T01", "--reason", "Completed successfully"]),
		);
		expect(result.ok).toBe(true);

		// Task state should reflect the close operation
		const stores = createClosableStateStores();
		const task = stores.taskStore.getTask("M01-S01-T01");
		stores.close();

		expect(task.data?.status).toBe("closed");
	});

	it("fails fast when task does not exist", async () => {
		const result = JSON.parse(await taskCloseCmd(["M01-S01-T99"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TASK_NOT_FOUND");
	});

	it("fails fast with invalid arguments", async () => {
		const result = JSON.parse(await taskCloseCmd([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ARGS");
	});

	it("preserves wave index from task in journal entry", async () => {
		// Create and claim another task with specific wave
		const stores = createClosableStateStores();
		const taskResult = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 2,
			title: "Wave Task",
			wave: 3,
		});
		expect(taskResult.ok).toBe(true);
		stores.close();

		// Claim the task first
		const claimResult = JSON.parse(await taskClaimCmd(["M01-S01-T02", "wave-agent"]));
		expect(claimResult.ok).toBe(true);

		const journalPath = path.join(tmpDir, ".tff", "journal", "M01-S01.jsonl");

		// Close the task with wave
		const result = JSON.parse(await taskCloseCmd(["M01-S01-T02"]));
		expect(result.ok).toBe(true);

		const journalContent = readFileSync(journalPath, "utf-8");
		const entries = journalContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		// Find the task-completed entry for T02
		const completedEntry = entries.find(
			(e) => e.type === "task-completed" && e.taskId === "M01-S01-T02",
		);
		expect(completedEntry).toBeDefined();
		expect(completedEntry.waveIndex).toBe(3);
	});

	it("increments sequence number for each journal entry", async () => {
		const journalPath = path.join(tmpDir, ".tff", "journal", "M01-S01.jsonl");

		// Close the task (which adds task-completed after task-started)
		const result = JSON.parse(await taskCloseCmd(["M01-S01-T01"]));
		expect(result.ok).toBe(true);

		const journalContent = readFileSync(journalPath, "utf-8");
		const entries = journalContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		// Sequence numbers should be 0, 1
		expect(entries[0].seq).toBe(0);
		expect(entries[1].seq).toBe(1);
	});
});
