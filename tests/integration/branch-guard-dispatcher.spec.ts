import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectInitCmd } from "../../src/cli/commands/project-init.cmd.js";
import { withMutatingCommand } from "../../src/cli/utils/with-mutating-command.js";

describe("branch-guard chokepoint via CLI dispatcher", () => {
	let workdir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	beforeEach(() => {
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		workdir = fs.mkdtempSync(path.join(os.tmpdir(), "branch-guard-dispatcher-"));
		homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "tff-home-dispatcher-"));

		execSync("git init --initial-branch=main --quiet", { cwd: workdir });
		execSync(
			'git -c user.email=t@t.invalid -c user.name=t commit --allow-empty -m "init" --quiet',
			{ cwd: workdir },
		);

		process.env.TFF_CC_HOME = homeDir;
		process.chdir(workdir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		fs.rmSync(workdir, { recursive: true, force: true });
		fs.rmSync(homeDir, { recursive: true, force: true });
	});

	it("rejects a mutating command when on main (default branch)", async () => {
		const dispatcher = withMutatingCommand(projectInitCmd);
		const result = await dispatcher(["--name", "guard-test"]);
		const parsed = JSON.parse(result);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
	});

	it("allows a mutating command on a feature branch (guard does not fire)", async () => {
		execSync("git checkout -b feat/x --quiet", { cwd: workdir });
		const dispatcher = withMutatingCommand(projectInitCmd);
		const result = await dispatcher(["--name", "guard-test"]);
		const parsed = JSON.parse(result);
		// The command might succeed or fail for unrelated reasons (e.g. SQLite state).
		// The only requirement: the branch-guard refusal must NOT be the cause.
		if (!parsed.ok) {
			expect(parsed.error.code).not.toBe("REFUSED_ON_DEFAULT_BRANCH");
		}
	});
});
