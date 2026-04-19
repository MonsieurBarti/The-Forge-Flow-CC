import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const HOOK = join(process.cwd(), "scripts/hooks/branch-guard.mjs");
const CLI = join(process.cwd(), "dist/cli/index.js");

const runHook = (cwd: string, env: Record<string, string> = {}) =>
	spawnSync("node", [HOOK], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });

describe("pre-commit branch-guard hook (shells out to branch-guard:check)", () => {
	let repo: string;

	beforeAll(() => {
		// Ensure the CLI build is present — `bun run test` runs build first, but guard here.
		if (!existsSync(CLI)) {
			throw new Error(
				`CLI build not found at ${CLI}. Run 'bun run build' before running this test.`,
			);
		}
	});

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), "bg-hook-repo-"));
	});

	afterEach(() => {
		rmSync(repo, { recursive: true, force: true });
	});

	it("exits 0 on non-milestone branch (no .tff-project-id needed)", () => {
		execFileSync("git", ["init", "-b", "main"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), "any-id", "utf8");
		// Hook exits 0 immediately: no cliPath exists in a fresh tmp repo, so it bails early.
		const res = runHook(repo);
		expect(res.status).toBe(0);
	});

	it("exits 0 when TFF_ALLOW_MILESTONE_COMMIT=1", () => {
		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), "any-id", "utf8");
		const res = runHook(repo, { TFF_ALLOW_MILESTONE_COMMIT: "1" });
		expect(res.status).toBe(0);
	});

	it("exits 0 when .tff-project-id is absent", () => {
		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		const res = runHook(repo);
		expect(res.status).toBe(0);
	});

	it("exits 0 when dist/cli/index.js is absent (no build in repo)", () => {
		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), "any-id", "utf8");
		// No dist/cli/index.js in the tmp repo — hook exits 0 (cannot verify, don't block)
		const res = runHook(repo);
		expect(res.status).toBe(0);
	});

	describe("with real CLI (project root as cwd)", () => {
		const projectRoot = process.cwd();

		it("exits 0 on non-milestone branch in project root", () => {
			// The project's own git is on a feature branch — not a milestone branch.
			const res = runHook(projectRoot);
			// Either exits 0 (not a milestone branch) or possibly exits 0 due to no open slices.
			// We do NOT want this to exit 1 unconditionally.
			expect(res.status).toBe(0);
		});
	});
});
