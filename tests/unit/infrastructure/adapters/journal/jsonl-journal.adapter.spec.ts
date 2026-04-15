import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JsonlJournalAdapter } from "../../../src/infrastructure/testing/jsonl-journal.adapter.js";
import { isOk } from "../../src/../../domain/result.js";
import { JournalEntryBuilder } from "../../src/../../domain/value-objects/journal-entry.builder.js";

let basePath: string;

beforeAll(() => {
	basePath = mkdtempSync(join(tmpdir(), "tff-journal-"));
});

afterAll(() => {
	rmSync(basePath, { recursive: true, force: true });
});

describe("JsonlJournalAdapter — adapter-specific", () => {
	it("survives process restart (AC1)", () => {
		const sliceId = crypto.randomUUID();
		const builder = new JournalEntryBuilder().withSliceId(sliceId);
		const repo1 = new JsonlJournalAdapter(basePath);
		repo1.append(sliceId, builder.buildPhaseChanged());
		const repo2 = new JsonlJournalAdapter(basePath);
		const result = repo2.readAll(sliceId);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data).toHaveLength(1);
	});

	it("skips corrupt lines and returns valid entries (AC7)", () => {
		const sliceId = crypto.randomUUID();
		const builder = new JournalEntryBuilder().withSliceId(sliceId);
		const repo = new JsonlJournalAdapter(basePath);
		repo.append(sliceId, builder.buildPhaseChanged());
		appendFileSync(join(basePath, `${sliceId}.jsonl`), "{truncated\n", "utf-8");
		repo.append(sliceId, builder.buildPhaseChanged({ from: "executing", to: "verifying" }));
		const result = repo.readAll(sliceId);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data.length).toBeGreaterThanOrEqual(2);
	});

	it("returns empty array for missing file (AC12)", () => {
		const repo = new JsonlJournalAdapter(basePath);
		const result = repo.readAll("nonexistent-slice");
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data).toHaveLength(0);
	});

	it("returns empty array for empty file (AC12)", () => {
		const sliceId = crypto.randomUUID();
		writeFileSync(join(basePath, `${sliceId}.jsonl`), "", "utf-8");
		const repo = new JsonlJournalAdapter(basePath);
		const result = repo.readAll(sliceId);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data).toHaveLength(0);
	});

	it("auto-creates directory on first append (AC11)", () => {
		const nestedPath = join(basePath, "nested", "dir");
		const repo = new JsonlJournalAdapter(nestedPath);
		const builder = new JournalEntryBuilder().withSliceId("test");
		const result = repo.append("test", builder.buildPhaseChanged());
		expect(isOk(result)).toBe(true);
	});
});

import { runJournalContractTests } from "../../src/../../domain/ports/journal-repository.contract.spec.js";

runJournalContractTests("JsonlJournalAdapter", () => new JsonlJournalAdapter(basePath));
