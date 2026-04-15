import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { JsonlStoreAdapter } from "../../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js";

describe("JsonlStoreAdapter", () => {
	let adapter: JsonlStoreAdapter;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "tff-jsonl-"));
		adapter = new JsonlStoreAdapter(tempDir);
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("should append and read observations", async () => {
		await adapter.appendObservation({
			ts: "2026-03-21T14:30:00Z",
			session: "s1",
			tool: "Bash",
			args: "npm test",
			project: "/p",
		});
		await adapter.appendObservation({
			ts: "2026-03-21T14:30:05Z",
			session: "s1",
			tool: "Edit",
			args: null,
			project: "/p",
		});

		const result = await adapter.readObservations();
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(2);
			expect(result.data[0].tool).toBe("Bash");
		}
	});

	it("should write and read patterns", async () => {
		await adapter.writePatterns([
			{ sequence: ["Read", "Edit"], count: 5, sessions: 3, projects: 2, lastSeen: "2026-03-21" },
		]);

		const result = await adapter.readPatterns();
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(1);
		}
	});

	it("should return empty array when no file exists", async () => {
		const result = await adapter.readObservations();
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(0);
		}
	});
});
