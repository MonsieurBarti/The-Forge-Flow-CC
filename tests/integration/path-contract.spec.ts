import { mkdtempSync, rmSync, existsSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { describe, it, expect, afterEach, beforeEach } from "vitest";

describe("path contract: artifacts under .tff-cc/, nothing at .tff/", () => {
	let tmpRepo: string;
	let tffCcHome: string;
	const CLI = `${process.cwd()}/dist/cli/index.js`;

	beforeEach(() => {
		tmpRepo = mkdtempSync(join(tmpdir(), "tff-path-contract-"));
		tffCcHome = mkdtempSync(join(tmpdir(), "tff-cc-home-"));
		execSync("git init -q", { cwd: tmpRepo });
		execSync("git -c user.email=t@t -c user.name=t commit --allow-empty -m init -q", {
			cwd: tmpRepo,
		});
	});

	afterEach(() => {
		rmSync(tmpRepo, { recursive: true, force: true });
		rmSync(tffCcHome, { recursive: true, force: true });
	});

	const cli = (cmd: string) =>
		execSync(`node ${CLI} ${cmd}`, {
			cwd: tmpRepo,
			env: { ...process.env, TFF_CC_HOME: tffCcHome },
			stdio: ["ignore", "pipe", "pipe"],
		}).toString();

	it("project:init creates .tff-cc/ symlink, never .tff/", () => {
		cli('project:init --name "TestProject"');

		// Symlink should exist as .tff-cc/
		const symlinkPath = join(tmpRepo, ".tff-cc");
		expect(existsSync(symlinkPath)).toBe(true);
		expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);

		// .tff/ must NOT exist as a real directory
		const tffPath = join(tmpRepo, ".tff");
		const isRealDir = existsSync(tffPath) && !lstatSync(tffPath).isSymbolicLink();
		expect(isRealDir, ".tff/ must not exist as a real directory after project:init").toBe(false);
	});

	it("after milestone + slice + sync, nothing lands at .tff/", () => {
		cli('project:init --name "TestProject"');

		// Create milestone; output is two lines: "ok\n{...json...}"
		// milestone:create requires --name (not --title); uses number field for M-style IDs
		const miRaw = cli('milestone:create --name "M1"');
		const miJson = JSON.parse(miRaw.trim().split("\n").pop()!);
		const milestoneNumber: number = miJson.data.milestone.number;
		// Build M-style ID (M01, M02, …) from number for sync:state
		const milestoneShortId = `M${String(milestoneNumber).padStart(2, "0")}`;

		// slice:create auto-detects the open milestone when --milestone-id is omitted
		cli('slice:create --title "S1"');

		// sync:state requires the M-style short ID (e.g. M01), not the UUID
		cli(`sync:state --milestone-id ${milestoneShortId}`);

		const tffPath = join(tmpRepo, ".tff");
		const isRealDir = existsSync(tffPath) && !lstatSync(tffPath).isSymbolicLink();
		expect(isRealDir, ".tff/ must not exist as a real directory after project ops").toBe(false);
	});
});
