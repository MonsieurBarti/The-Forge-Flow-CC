import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	diffAgainstManifest,
	readManifest,
} from "../../src/application/skills/baseline-registry.js";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("skill-baselines.json governance invariant", () => {
	const manifest = readManifest(repoRoot);

	it("manifest version is 1", () => {
		expect(manifest.version).toBe(1);
	});

	it("every skill dir has a matching manifest row", () => {
		const report = diffAgainstManifest(repoRoot, manifest);
		if (report.missing.length > 0 || report.mismatched.length > 0 || report.orphaned.length > 0) {
			const parts: string[] = [];
			if (report.missing.length > 0) {
				parts.push(`missing manifest rows: ${report.missing.join(", ")}`);
			}
			if (report.mismatched.length > 0) {
				parts.push(
					`mismatched hashes:\n${report.mismatched
						.map(
							(m) =>
								`  ${m.id}: expected ${m.expected.slice(0, 12)}…, actual ${m.actual.slice(0, 12)}…`,
						)
						.join("\n")}`,
				);
			}
			if (report.orphaned.length > 0) {
				parts.push(`orphaned manifest rows: ${report.orphaned.join(", ")}`);
			}
			parts.push("");
			parts.push(
				'Remediation: run `tff-tools skills:approve --id <skill> --reason "<why>"` after committing the content change.',
			);
			throw new Error(parts.join("\n"));
		}
	});
});
