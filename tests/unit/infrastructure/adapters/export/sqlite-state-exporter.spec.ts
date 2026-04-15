import { beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { SQLiteStateExporter } from "../../../../../src/infrastructure/adapters/export/sqlite-state-exporter.js";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

describe("SQLiteStateExporter", () => {
	let adapter: SQLiteStateAdapter;
	let exporter: SQLiteStateExporter;

	beforeEach(() => {
		adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		exporter = new SQLiteStateExporter(adapter);
	});

	it("exports empty state successfully", () => {
		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.version).toBe(1);
		expect(result.data.project).toBeNull();
		expect(result.data.milestones).toEqual([]);
		expect(result.data.slices).toEqual([]);
		expect(result.data.tasks).toEqual([]);
		expect(result.data.dependencies).toEqual([]);
		expect(result.data.workflowSession).toBeNull();
		expect(result.data.reviews).toEqual([]);
		expect(result.data.exportedAt).toBeDefined();
	});

	it("exports project correctly", () => {
		adapter.saveProject({ name: "Test Project", vision: "Test vision" });

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.project).not.toBeNull();
		expect(result.data.project!.name).toBe("Test Project");
		expect(result.data.project!.vision).toBe("Test vision");
		expect(result.data.project!.id).toBe("singleton");
		expect(result.data.project!.createdAt).toBeInstanceOf(Date);
	});

	it("exports milestones correctly", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createMilestone({ number: 2, name: "M2" });

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.milestones).toHaveLength(2);
		expect(result.data.milestones[0].name).toBe("M1");
		expect(result.data.milestones[1].name).toBe("M2");
		expect(result.data.milestones[0].id).toBe("M01");
	});

	it("exports slices correctly", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "Slice 1" });
		adapter.createSlice({ milestoneId: "M01", number: 2, title: "Slice 2" });

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.slices).toHaveLength(2);
		expect(result.data.slices[0].title).toBe("Slice 1");
		expect(result.data.slices[1].title).toBe("Slice 2");
		expect(result.data.slices[0].id).toBe("M01-S01");
	});

	it("exports tasks correctly", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1", description: "Desc" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "Task 2" });

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.tasks).toHaveLength(2);
		expect(result.data.tasks[0].title).toBe("Task 1");
		expect(result.data.tasks[0].description).toBe("Desc");
		expect(result.data.tasks[1].title).toBe("Task 2");
		expect(result.data.tasks[0].id).toBe("M01-S01-T01");
	});

	it("exports dependencies correctly", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "Task 2" });
		adapter.addDependency("M01-S01-T02", "M01-S01-T01", "blocks");

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.dependencies).toHaveLength(1);
		expect(result.data.dependencies[0].fromId).toBe("M01-S01-T02");
		expect(result.data.dependencies[0].toId).toBe("M01-S01-T01");
		expect(result.data.dependencies[0].type).toBe("blocks");
	});

	it("exports workflow session correctly", () => {
		adapter.saveSession({
			phase: "executing",
			activeSliceId: "M01-S01",
			activeMilestoneId: "M01",
		});

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.workflowSession).not.toBeNull();
		expect(result.data.workflowSession!.phase).toBe("executing");
		expect(result.data.workflowSession!.activeSliceId).toBe("M01-S01");
	});

	it("exports reviews correctly", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.recordReview({
			sliceId: "M01-S01",
			type: "spec",
			reviewer: "agent-a",
			verdict: "approved",
			commitSha: "abc123",
			notes: "Looks good",
			createdAt: new Date().toISOString(),
		});

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		expect(result.data.reviews).toHaveLength(1);
		expect(result.data.reviews[0].type).toBe("spec");
		expect(result.data.reviews[0].reviewer).toBe("agent-a");
		expect(result.data.reviews[0].verdict).toBe("approved");
	});

	it("exports complete state with all entity types", () => {
		// Setup complete project state
		adapter.saveProject({ name: "Full Test", vision: "Test vision" });
		adapter.createMilestone({ number: 1, name: "Milestone 1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "Slice 1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		adapter.saveSession({ phase: "planning" });

		const result = exporter.export();
		expect(isOk(result)).toBe(true);
		if (!isOk(result)) return;

		// Verify all sections present and valid
		expect(result.data.project).not.toBeNull();
		expect(result.data.milestones).toHaveLength(1);
		expect(result.data.slices).toHaveLength(1);
		expect(result.data.tasks).toHaveLength(1);
		expect(result.data.workflowSession).not.toBeNull();
		expect(result.data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
	});
});
