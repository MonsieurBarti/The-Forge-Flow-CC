import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QUALITY_GATES } from "../../src/shared/quality-gates/registry.js";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("quality-gates registry integrity", () => {
	it("has at least one gate registered", () => {
		expect(QUALITY_GATES.length).toBeGreaterThan(0);
	});

	for (const gate of QUALITY_GATES) {
		describe(`gate: ${gate.id}`, () => {
			it(`has a meta-test file at ${gate.metaTestPath}`, () => {
				const abs = path.resolve(repoRoot, gate.metaTestPath);
				expect(fs.existsSync(abs), `missing meta-test: ${gate.metaTestPath}`).toBe(true);
				expect(fs.statSync(abs).size).toBeGreaterThan(0);
			});
			it(`has an enforcement site at ${gate.enforcementSite}`, () => {
				const abs = path.resolve(repoRoot, gate.enforcementSite);
				expect(fs.existsSync(abs), `missing enforcement site: ${gate.enforcementSite}`).toBe(true);
			});
		});
	}

	it("has unique gate ids", () => {
		const ids = QUALITY_GATES.map((g) => g.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
