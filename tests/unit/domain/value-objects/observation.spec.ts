import { describe, expect, it } from "vitest";
import { ObservationSchema } from "../../../src/domain/observation.js";

describe("Observation", () => {
	it("should accept a valid observation", () => {
		const obs = ObservationSchema.parse({
			ts: "2026-03-21T14:30:00Z",
			session: "abc123",
			tool: "Bash",
			args: "npm test",
			project: "/path/to/project",
		});
		expect(obs.tool).toBe("Bash");
	});

	it("should accept null args", () => {
		const obs = ObservationSchema.parse({
			ts: "2026-03-21T14:30:00Z",
			session: "abc123",
			tool: "Read",
			args: null,
			project: "/path/to/project",
		});
		expect(obs.args).toBeNull();
	});

	it("should reject missing tool", () => {
		expect(() =>
			ObservationSchema.parse({
				ts: "2026-03-21T14:30:00Z",
				session: "abc123",
				project: "/path/to/project",
			}),
		).toThrow();
	});
});
