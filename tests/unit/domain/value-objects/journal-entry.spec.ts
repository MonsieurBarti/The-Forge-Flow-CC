import { describe, expect, it } from "vitest";
import { JournalEntrySchema } from "../../../../src/domain/value-objects/journal-entry.js";

describe("JournalEntrySchema", () => {
	const base = { seq: 0, sliceId: "M01-S04", timestamp: new Date().toISOString() };

	it("validates task-started entry", () => {
		const entry = {
			...base,
			type: "task-started",
			taskId: "T01",
			waveIndex: 0,
			agentIdentity: "opus",
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates task-completed entry", () => {
		const entry = {
			...base,
			type: "task-completed",
			taskId: "T01",
			waveIndex: 0,
			durationMs: 1000,
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates task-completed with optional commitHash", () => {
		const entry = {
			...base,
			type: "task-completed",
			taskId: "T01",
			waveIndex: 0,
			durationMs: 1000,
			commitHash: "abc123",
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates task-failed entry", () => {
		const entry = {
			...base,
			type: "task-failed",
			taskId: "T01",
			waveIndex: 0,
			errorCode: "AGENT.FAILURE",
			errorMessage: "fail",
			retryable: true,
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates file-written entry", () => {
		const entry = {
			...base,
			type: "file-written",
			taskId: "T01",
			filePath: "src/foo.ts",
			operation: "created",
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates checkpoint-saved entry", () => {
		const entry = { ...base, type: "checkpoint-saved", waveIndex: 0, completedTaskCount: 3 };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates phase-changed entry", () => {
		const entry = { ...base, type: "phase-changed", from: "planning", to: "executing" };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates artifact-written entry", () => {
		const entry = {
			...base,
			type: "artifact-written",
			artifactPath: ".tff-cc/milestones/M01/slices/M01-S04/SPEC.md",
			artifactType: "spec",
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates guardrail-violation entry", () => {
		const entry = {
			...base,
			type: "guardrail-violation",
			taskId: "T01",
			waveIndex: 0,
			violations: [{ ruleId: "NO_SECRETS", message: "Secret detected", severity: "error" }],
			action: "blocked",
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates overseer-intervention entry", () => {
		const entry = {
			...base,
			type: "overseer-intervention",
			taskId: "T01",
			strategy: "timeout",
			reason: "Took too long",
			action: "aborted",
			retryCount: 0,
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates execution-lifecycle entry", () => {
		const entry = {
			...base,
			type: "execution-lifecycle",
			sessionId: "sess-1",
			action: "started",
			resumeCount: 0,
		};
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("validates optional correlationId", () => {
		const entry = { ...base, type: "phase-changed", from: "a", to: "b", correlationId: "corr-1" };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(true);
	});

	it("rejects invalid type", () => {
		const entry = { ...base, type: "unknown-type" };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(false);
	});

	it("rejects missing required fields", () => {
		const entry = { ...base, type: "task-started" };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(false);
	});

	it("rejects negative seq", () => {
		const entry = { ...base, seq: -1, type: "phase-changed", from: "a", to: "b" };
		expect(JournalEntrySchema.safeParse(entry).success).toBe(false);
	});
});
