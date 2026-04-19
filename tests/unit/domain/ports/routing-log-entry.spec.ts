import { describe, expect, it } from "vitest";
import type {
	DebugEventLogEntry,
	RoutingLogEntry,
} from "../../../../src/domain/ports/routing-decision-logger.port.js";

describe("DebugEventLogEntry", () => {
	it("is assignable to RoutingLogEntry union", () => {
		const entry: DebugEventLogEntry = {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		};
		const asUnion: RoutingLogEntry = entry;
		expect(asUnion.kind).toBe("debug");
	});
});
