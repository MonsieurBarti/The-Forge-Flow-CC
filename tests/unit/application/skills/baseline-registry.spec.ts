import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	computeSha,
	diffAgainstManifest,
	readManifest,
	writeManifest,
} from "../../../../src/application/skills/baseline-registry.js";

describe("baseline-registry I/O", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-registry-"));
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("computeSha returns stable sha256 hex for identical input", () => {
		expect(computeSha("hello\n")).toBe(computeSha("hello\n"));
		expect(computeSha("hello\n")).toMatch(/^[0-9a-f]{64}$/);
	});

	it("computeSha differs for different inputs", () => {
		expect(computeSha("a")).not.toBe(computeSha("b"));
	});

	it("readManifest returns an empty manifest when file missing", () => {
		const m = readManifest(tmp);
		expect(m).toEqual({ version: 1, skills: {} });
	});

	it("readManifest throws when 'skills' key is missing", () => {
		fs.mkdirSync(path.join(tmp, "skills"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/skill-baselines.json"), JSON.stringify({ version: 1 }));
		expect(() => readManifest(tmp)).toThrow(/'skills' must be an object/);
	});

	it("readManifest throws when 'skills' is an array", () => {
		fs.mkdirSync(path.join(tmp, "skills"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, "skills/skill-baselines.json"),
			JSON.stringify({ version: 1, skills: [] }),
		);
		expect(() => readManifest(tmp)).toThrow(/'skills' must be an object/);
	});

	it("writeManifest round-trips with stable key order + trailing newline", () => {
		writeManifest(tmp, {
			version: 1,
			skills: {
				zebra: {
					sha256: "0".repeat(64),
					originalCommitSha: "abc",
					approvedAt: "2026-04-21T00:00:00Z",
					refinementId: null,
				},
				apple: {
					sha256: "1".repeat(64),
					originalCommitSha: "def",
					approvedAt: "2026-04-21T00:00:00Z",
					refinementId: null,
				},
			},
		});

		const raw = fs.readFileSync(path.join(tmp, "skills/skill-baselines.json"), "utf8");
		expect(raw.endsWith("\n")).toBe(true);
		// Sorted by skill id
		expect(raw.indexOf('"apple"')).toBeLessThan(raw.indexOf('"zebra"'));
		// Sorted keys within a row
		const appleBlock = raw.slice(raw.indexOf('"apple"'));
		expect(appleBlock.indexOf('"approvedAt"')).toBeLessThan(
			appleBlock.indexOf('"originalCommitSha"'),
		);
		expect(appleBlock.indexOf('"originalCommitSha"')).toBeLessThan(
			appleBlock.indexOf('"refinementId"'),
		);
		expect(appleBlock.indexOf('"refinementId"')).toBeLessThan(appleBlock.indexOf('"sha256"'));
	});
});

describe("diffAgainstManifest", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-diff-"));
		fs.mkdirSync(path.join(tmp, "skills", "alpha"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/alpha/SKILL.md"), "alpha content\n");
		fs.mkdirSync(path.join(tmp, "skills", "beta"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/beta/SKILL.md"), "beta content\n");
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("reports `missing` when a skill dir has no manifest row", () => {
		const manifest = { version: 1 as const, skills: {} };
		const report = diffAgainstManifest(tmp, manifest);
		expect(report.missing.sort()).toEqual(["alpha", "beta"]);
		expect(report.mismatched).toEqual([]);
		expect(report.orphaned).toEqual([]);
	});

	it("reports `orphaned` when a manifest row has no skill dir", () => {
		const manifest = {
			version: 1 as const,
			skills: {
				ghost: {
					sha256: "x".repeat(64),
					originalCommitSha: "abc",
					approvedAt: "t",
					refinementId: null,
				},
			},
		};
		const report = diffAgainstManifest(tmp, manifest);
		expect(report.orphaned).toContain("ghost");
	});

	it("reports `mismatched` with expected/actual when hash differs", () => {
		const alphaActual = computeSha("alpha content\n");
		const manifest = {
			version: 1 as const,
			skills: {
				alpha: {
					sha256: "0".repeat(64),
					originalCommitSha: "abc",
					approvedAt: "t",
					refinementId: null,
				},
				beta: {
					sha256: computeSha("beta content\n"),
					originalCommitSha: "abc",
					approvedAt: "t",
					refinementId: null,
				},
			},
		};
		const report = diffAgainstManifest(tmp, manifest);
		expect(report.mismatched).toEqual([
			{ id: "alpha", expected: "0".repeat(64), actual: alphaActual },
		]);
		expect(report.missing).toEqual([]);
		expect(report.orphaned).toEqual([]);
	});

	it("returns empty report when everything matches", () => {
		const manifest = {
			version: 1 as const,
			skills: {
				alpha: {
					sha256: computeSha("alpha content\n"),
					originalCommitSha: "abc",
					approvedAt: "t",
					refinementId: null,
				},
				beta: {
					sha256: computeSha("beta content\n"),
					originalCommitSha: "abc",
					approvedAt: "t",
					refinementId: null,
				},
			},
		};
		const report = diffAgainstManifest(tmp, manifest);
		expect(report.missing).toEqual([]);
		expect(report.mismatched).toEqual([]);
		expect(report.orphaned).toEqual([]);
	});
});
