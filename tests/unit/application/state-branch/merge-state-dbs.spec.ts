import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergeStateDbs } from "../../../../src/application/state-branch/merge-state-dbs.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

describe("mergeStateDbs", () => {
	it("should merge child slice entities into parent DB", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "merge-"));
		const parentPath = path.join(dir, "parent.db");
		const childPath = path.join(dir, "child.db");

		// Set up parent with project + milestone + slice
		const parent = SQLiteStateAdapter.create(parentPath);
		parent.init();
		parent.saveProject({ name: "P", vision: "V" });
		parent.createMilestone({ number: 1, name: "M1" });
		parent.createSlice({ milestoneId: "M01", number: 1, title: "S1", tier: "F-lite" });
		parent.close();

		// Set up child with same project + milestone + slice + tasks
		const child = SQLiteStateAdapter.create(childPath);
		child.init();
		child.saveProject({ name: "P", vision: "V" });
		child.createMilestone({ number: 1, name: "M1" });
		child.createSlice({ milestoneId: "M01", number: 1, title: "S1", tier: "F-lite" });
		child.createTask({ sliceId: "M01-S01", number: 1, title: "T1" });
		child.close();

		const result = mergeStateDbs(parentPath, childPath, "M01-S01");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.entitiesMerged).toBeGreaterThan(0);
		}

		// Verify parent now has the task
		const parentAfter = SQLiteStateAdapter.create(parentPath);
		parentAfter.init();
		const tasks = parentAfter.listTasks("M01-S01");
		expect(tasks.ok).toBe(true);
		if (tasks.ok) {
			expect(tasks.data.length).toBe(1);
		}
		parentAfter.close();
	});
});
