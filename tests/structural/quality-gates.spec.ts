import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QUALITY_GATES } from "../../src/shared/quality-gates/registry.js";

const repoRoot = path.resolve(__dirname, "..", "..");

// This list is the "ratchet": entries here must remain enforced forever.
// Flipping back to `pending` requires deleting from this list IN THE SAME PR,
// which surfaces the regression in review.
const ENFORCED_RATCHET: readonly string[] = [
	"branch-guard",
	"ship-completeness",
	"milestone-completeness",
	"coverage-in-ci",
	"commitlint-in-ci",
	"value-object-invariants",
	"command-mutates-annotation",
];

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

			if (gate.status === "enforced") {
				it("meta-test has at least one real (non-todo) assertion", () => {
					const content = fs.readFileSync(path.resolve(repoRoot, gate.metaTestPath), "utf8");
					const hasRealAssertion = /\b(?:it|test)\s*\(/.test(
						content.replace(/\b(?:it|test)\.todo\s*\([^)]*\)/g, ""),
					);
					expect(
						hasRealAssertion,
						`gate "${gate.id}" status is enforced but meta-test contains only it.todo stubs at ${gate.metaTestPath}`,
					).toBe(true);
				});
			}
		});
	}

	it("has unique gate ids", () => {
		const ids = QUALITY_GATES.map((g) => g.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("every gate on the enforced-ratchet is still enforced", () => {
		for (const id of ENFORCED_RATCHET) {
			const gate = QUALITY_GATES.find((g) => g.id === id);
			expect(gate, `gate "${id}" missing from registry`).toBeDefined();
			expect(gate?.status, `gate "${id}" regressed from enforced to ${gate?.status}`).toBe(
				"enforced",
			);
		}
	});
});
