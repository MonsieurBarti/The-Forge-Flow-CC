import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeSha, writeManifest } from "../../../../src/application/skills/baseline-registry.js";
import { driftReport } from "../../../../src/application/skills/drift-report.js";

interface GitShowStub {
	show: (commitSha: string, relPath: string) => Promise<string>;
}

describe("driftReport", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drift-report-"));
		fs.mkdirSync(path.join(tmp, "skills/foo"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "a".repeat(100));
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: computeSha("a".repeat(100)),
					originalCommitSha: "commit-original",
					approvedAt: "2026-04-20T00:00:00Z",
					refinementId: null,
				},
			},
		});
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("returns ratio 0 when content matches original", async () => {
		const git: GitShowStub = {
			show: async () => "a".repeat(100),
		};
		const report = await driftReport({ root: tmp, git });
		expect(report.skills).toEqual([{ id: "foo", ratio: 0, overThreshold: false }]);
	});

	it("returns ratio > 0 when current differs from original", async () => {
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "b".repeat(100));
		const git: GitShowStub = { show: async () => "a".repeat(100) };
		const report = await driftReport({ root: tmp, git });
		expect(report.skills[0].ratio).toBe(1);
		expect(report.skills[0].overThreshold).toBe(true);
	});

	it("degrades to { error } when git show throws", async () => {
		const git: GitShowStub = {
			show: async () => {
				throw new Error("fatal: bad object commit-original");
			},
		};
		const report = await driftReport({ root: tmp, git });
		expect(report.skills[0]).toMatchObject({ id: "foo" });
		expect(report.skills[0].error).toContain("fatal:");
		expect(report.skills[0].ratio).toBeUndefined();
	});
});
