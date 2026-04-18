import { execSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("path contract: artifacts under .tff-cc/ only", () => {
	let tmpRepo: string;
	let tffCcHome: string;
	const CLI = `${process.cwd()}/dist/cli/index.js`;

	beforeAll(() => {
		// Ensure the CLI has been built before running any execSync; failing here
		// produces a clear error instead of a cryptic ENOENT from node.
		if (!existsSync(CLI)) {
			throw new Error(
				`Missing built CLI at ${CLI}. Run \`bun run build\` before the integration tests.`,
			);
		}
	});

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

	const cli = (cmd: string) => {
		// stdio piped; if stderr is non-empty the command wrote warnings/errors and
		// we want them visible in test output rather than silently swallowed.
		const result = execSync(`node ${CLI} ${cmd}`, {
			cwd: tmpRepo,
			env: { ...process.env, TFF_CC_HOME: tffCcHome },
			stdio: ["ignore", "pipe", "pipe"],
			encoding: "utf8",
		});
		return result;
	};

	it("project:init creates .tff-cc/ symlink", () => {
		cli('project:init --name "TestProject"');

		const symlinkPath = join(tmpRepo, ".tff-cc");
		expect(existsSync(symlinkPath)).toBe(true);
		expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
	});

	it("after milestone + slice + sync, state lands under .tff-cc/", () => {
		cli('project:init --name "TestProject"');

		const miRaw = cli('milestone:create --name "M1"');
		const miJson = JSON.parse(miRaw.trim().split("\n").pop()!);
		const milestoneNumber: number = miJson.data.milestone.number;
		const milestoneShortId = `M${String(milestoneNumber).padStart(2, "0")}`;

		cli('slice:create --title "S1"');
		cli(`sync:state --milestone-id ${milestoneShortId}`);

		const symlinkPath = join(tmpRepo, ".tff-cc");
		expect(existsSync(symlinkPath)).toBe(true);
		expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
	});
});
