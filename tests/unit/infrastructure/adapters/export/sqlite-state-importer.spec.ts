import { beforeEach, describe, expect, it } from "vitest";
import { SQLiteStateExporter } from "../../../src/infrastructure/sqlite-state-exporter.js";
import { SQLiteStateImporter } from "../../../src/infrastructure/sqlite-state-importer.js";
import { isOk } from "../../src/../domain/result.js";
import { SQLiteStateAdapter } from "../sqlite/sqlite-state.adapter.js";

describe("SQLiteStateImporter", () => {
	let adapter: SQLiteStateAdapter;
	let exporter: SQLiteStateExporter;
	let importer: SQLiteStateImporter;

	beforeEach(() => {
		adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		exporter = new SQLiteStateExporter(adapter);
		importer = new SQLiteStateImporter(adapter);
	});

	it("imports empty state successfully", () => {
		const snapshot = {
			version: 1,
			exportedAt: new Date().toISOString(),
			project: null,
			milestones: [],
			slices: [],
			tasks: [],
			dependencies: [],
			workflowSession: null,
			reviews: [],
		};

		const result = importer.import(snapshot);
		expect(isOk(result)).toBe(true);

		// Verify by exporting again
		const exported = exporter.export();
		expect(isOk(exported)).toBe(true);
		if (!isOk(exported)) return;

		expect(exported.data.project).toBeNull();
		expect(exported.data.milestones).toEqual([]);
	});

	it("round-trip: export → import → export produces identical state", () => {
		// Setup initial state
		adapter.saveProject({ name: "Test Project", vision: "Test vision" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "Slice 1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });

		// Export
		const firstExport = exporter.export();
		expect(isOk(firstExport)).toBe(true);
		if (!isOk(firstExport)) return;

		// Create fresh adapter and import
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		const freshImporter = new SQLiteStateImporter(freshAdapter);
		const importResult = freshImporter.import(firstExport.data);
		expect(isOk(importResult)).toBe(true);

		// Export from fresh adapter
		const freshExporter = new SQLiteStateExporter(freshAdapter);
		const secondExport = freshExporter.export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		// Compare (excluding exportedAt which will differ)
		expect(secondExport.data.project).toEqual(firstExport.data.project);
		expect(secondExport.data.milestones).toEqual(firstExport.data.milestones);
		expect(secondExport.data.slices).toEqual(firstExport.data.slices);
		expect(secondExport.data.tasks).toEqual(firstExport.data.tasks);
	});

	it("preserves slice status through round-trip", () => {
		// Setup with transitioned slice
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "Slice 1" });
		adapter.transitionSlice("M01-S01", "researching");
		adapter.transitionSlice("M01-S01", "planning");

		const firstExport = exporter.export();
		expect(isOk(firstExport)).toBe(true);
		if (!isOk(firstExport)) return;
		expect(firstExport.data.slices[0].status).toBe("planning");

		// Fresh import
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		const freshImporter = new SQLiteStateImporter(freshAdapter);
		freshImporter.import(firstExport.data);

		const freshExporter = new SQLiteStateExporter(freshAdapter);
		const secondExport = freshExporter.export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		expect(secondExport.data.slices[0].status).toBe("planning");
	});

	it("preserves task status and metadata through round-trip", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1", description: "Desc" });
		adapter.claimTask("M01-S01-T01", "agent-a");

		const firstExport = exporter.export();
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		new SQLiteStateImporter(freshAdapter).import(firstExport.data);

		const secondExport = new SQLiteStateExporter(freshAdapter).export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		const task = secondExport.data.tasks[0];
		expect(task.status).toBe("in_progress");
		expect(task.claimedBy).toBe("agent-a");
		expect(task.description).toBe("Desc");
		expect(task.claimedAt).toBeInstanceOf(Date);
	});

	it("preserves dependencies through round-trip", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "T1" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "T2" });
		adapter.addDependency("M01-S01-T02", "M01-S01-T01", "blocks");

		const firstExport = exporter.export();
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		new SQLiteStateImporter(freshAdapter).import(firstExport.data);

		const secondExport = new SQLiteStateExporter(freshAdapter).export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		expect(secondExport.data.dependencies).toHaveLength(1);
		expect(secondExport.data.dependencies[0].fromId).toBe("M01-S01-T02");
		expect(secondExport.data.dependencies[0].toId).toBe("M01-S01-T01");
	});

	it("preserves session through round-trip", () => {
		adapter.saveSession({
			phase: "executing",
			activeSliceId: "M01-S01",
			activeMilestoneId: "M01",
			pausedAt: new Date().toISOString(),
		});

		const firstExport = exporter.export();
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		new SQLiteStateImporter(freshAdapter).import(firstExport.data);

		const secondExport = new SQLiteStateExporter(freshAdapter).export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		expect(secondExport.data.workflowSession).not.toBeNull();
		expect(secondExport.data.workflowSession!.phase).toBe("executing");
		expect(secondExport.data.workflowSession!.activeSliceId).toBe("M01-S01");
	});

	it("preserves reviews through round-trip", () => {
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.recordReview({
			sliceId: "M01-S01",
			type: "code",
			reviewer: "agent-b",
			verdict: "changes_requested",
			commitSha: "def456",
			notes: "Fix this",
			createdAt: new Date().toISOString(),
		});

		const firstExport = exporter.export();
		const freshAdapter = SQLiteStateAdapter.createInMemory();
		freshAdapter.init();
		new SQLiteStateImporter(freshAdapter).import(firstExport.data);

		const secondExport = new SQLiteStateExporter(freshAdapter).export();
		expect(isOk(secondExport)).toBe(true);
		if (!isOk(secondExport)) return;

		expect(secondExport.data.reviews).toHaveLength(1);
		expect(secondExport.data.reviews[0].type).toBe("code");
		expect(secondExport.data.reviews[0].verdict).toBe("changes_requested");
	});
});
