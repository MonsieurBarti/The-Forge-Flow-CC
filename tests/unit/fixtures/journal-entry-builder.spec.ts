import { describe, expect, it } from "vitest";
import { JournalEntryBuilder } from "../../fixtures/journal-entry.builder.js";

describe("JournalEntryBuilder", () => {
	it("withTimestamp sets a custom timestamp", () => {
		const builder = new JournalEntryBuilder();
		const entry = builder.withTimestamp("2024-01-01T00:00:00Z").buildTaskStarted();
		expect(entry.timestamp).toBe("2024-01-01T00:00:00Z");
	});

	it("withCorrelationId sets a custom correlation id", () => {
		const builder = new JournalEntryBuilder();
		const entry = builder.withCorrelationId("corr-123").buildTaskStarted();
		expect(entry.correlationId).toBe("corr-123");
	});

	it("withSliceId sets a custom slice id", () => {
		const builder = new JournalEntryBuilder();
		const entry = builder.withSliceId("M01-S01").buildTaskStarted();
		expect(entry.sliceId).toBe("M01-S01");
	});
});
