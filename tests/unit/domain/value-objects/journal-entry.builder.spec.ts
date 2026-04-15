import { describe, expect, it } from "vitest";
import { JournalEntrySchema } from "../../../src/domain/journal-entry.js";
import { JournalEntryBuilder } from "../../../src/infrastructure/testing/journal-entry.builder.js";

describe("JournalEntryBuilder", () => {
	const builder = new JournalEntryBuilder().withSliceId("M01-S04");

	it("builds valid task-started entry", () => {
		const entry = builder.buildTaskStarted();
		expect(entry.type).toBe("task-started");
		expect(entry.sliceId).toBe("M01-S04");
		expect(JournalEntrySchema.safeParse({ ...entry, seq: 0 }).success).toBe(true);
	});

	it("builds valid task-completed with overrides", () => {
		const entry = builder.buildTaskCompleted({ taskId: "T01", commitHash: "abc" });
		expect(entry.taskId).toBe("T01");
		expect(entry.commitHash).toBe("abc");
	});

	it("builds valid phase-changed entry", () => {
		const entry = builder.buildPhaseChanged({ from: "planning", to: "executing" });
		expect(entry.from).toBe("planning");
		expect(entry.to).toBe("executing");
	});

	it("builds valid checkpoint-saved entry", () => {
		const entry = builder.buildCheckpointSaved({ waveIndex: 2, completedTaskCount: 5 });
		expect(entry.waveIndex).toBe(2);
		expect(entry.completedTaskCount).toBe(5);
	});

	it("builds all 10 entry types that pass Zod validation", () => {
		const entries = [
			builder.buildTaskStarted(),
			builder.buildTaskCompleted(),
			builder.buildTaskFailed(),
			builder.buildFileWritten(),
			builder.buildCheckpointSaved(),
			builder.buildPhaseChanged(),
			builder.buildArtifactWritten(),
			builder.buildGuardrailViolation(),
			builder.buildOverseerIntervention(),
			builder.buildExecutionLifecycle(),
		];
		for (const entry of entries) {
			expect(JournalEntrySchema.safeParse({ ...entry, seq: 0 }).success).toBe(true);
		}
	});
});
