import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { taskClaimCmd } from "../../../../src/cli/commands/task-claim.cmd.js";
import { createClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("task:claim — journal integration", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-claim-test-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;
		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		// Initialize project
		await projectInitCmd(["--name", "test-project", "--vision", "A test project"]);

		// Create milestone (auto-numbered as M01)
		const milestoneResult = JSON.parse(await milestoneCreateCmd(["--name", "Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);

		// Create slice (auto-numbered as S01 under M01)
		const sliceResult = JSON.parse(await sliceCreateCmd(["--title", "Test Slice"]));
		expect(sliceResult.ok).toBe(true);

		// Create task directly via store (no CLI command for task creation)
		const stores = createClosableStateStores();
		const taskResult = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Test Task",
		});
		stores.close();
		expect(taskResult.ok).toBe(true);
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

	it("writes task-started journal entry before claiming task", async () => {
		// Read project ID for journal path
		const projectIdPath = path.join(tmpDir, ".tff-project-id");
		const projectId = readFileSync(projectIdPath, "utf-8").trim();
		const journalPath = path.join(homeDir, projectId, "journal", "M01-S01.jsonl");

		// Claim the task
		const result = JSON.parse(await taskClaimCmd(["--task-id", "M01-S01-T01", "--claimed-by", "test-agent"]));
		expect(result.ok).toBe(true);

		// Verify journal file exists and contains task-started entry
		expect(existsSync(journalPath)).toBe(true);
		const journalContent = readFileSync(journalPath, "utf-8");
		const entries = journalContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			type: "task-started",
			sliceId: "M01-S01",
			taskId: "M01-S01-T01",
			waveIndex: 0,
			agentIdentity: "test-agent",
		});
		expect(entries[0].seq).toBe(0);
		expect(entries[0].timestamp).toBeDefined();
	});

	it("uses anonymous agent identity when not specified", async () => {
		// Read project ID for journal path
		const projectIdPath = path.join(tmpDir, ".tff-project-id");
		const projectId = readFileSync(projectIdPath, "utf-8").trim();
		const journalPath = path.join(homeDir, projectId, "journal", "M01-S01.jsonl");

		// Claim without specifying agent
		const result = JSON.parse(await taskClaimCmd(["--task-id", "M01-S01-T01"]));
		expect(result.ok).toBe(true);

		const journalContent = readFileSync(journalPath, "utf-8");
		const entry = JSON.parse(journalContent.trim());

		expect(entry.agentIdentity).toBe("anonymous");
	});

	it("fails fast when task does not exist", async () => {
		const result = JSON.parse(await taskClaimCmd(["--task-id", "M01-S01-T99", "--claimed-by", "test-agent"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TASK_NOT_FOUND");
	});

	it("fails fast with invalid arguments", async () => {
		const result = JSON.parse(await taskClaimCmd([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});

	it("preserves wave index from task in journal entry", async () => {
		// Create another task with specific wave
		const stores = createClosableStateStores();
		const taskResult = stores.taskStore.createTask({
			sliceId: "M01-S01",
			number: 2,
			title: "Wave Task",
			wave: 2,
		});
		stores.close();
		expect(taskResult.ok).toBe(true);

		// Read project ID for journal path
		const projectIdPath = path.join(tmpDir, ".tff-project-id");
		const projectId = readFileSync(projectIdPath, "utf-8").trim();
		const journalPath = path.join(homeDir, projectId, "journal", "M01-S01.jsonl");

		// Claim the task with wave
		const result = JSON.parse(await taskClaimCmd(["--task-id", "M01-S01-T02", "--claimed-by", "wave-agent"]));
		expect(result.ok).toBe(true);

		const journalContent = readFileSync(journalPath, "utf-8");
		const entries = journalContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		expect(entries[0]).toMatchObject({
			type: "task-started",
			taskId: "M01-S01-T02",
			waveIndex: 2,
			agentIdentity: "wave-agent",
		});
	});
});
