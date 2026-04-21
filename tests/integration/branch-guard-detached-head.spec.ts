import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectInitCmd } from "../../src/cli/commands/project-init.cmd.js";
import { withMutatingCommand } from "../../src/cli/utils/with-mutating-command.js";

describe("branch-guard refuses mutations on detached HEAD", () => {
	let workdir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	beforeEach(() => {
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		workdir = fs.mkdtempSync(path.join(os.tmpdir(), "branch-guard-detached-"));
		homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "tff-home-detached-"));

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

	it("rejects a mutating command when HEAD is detached at the tip of main", async () => {
		// Detach HEAD at the current commit (tip of main)
		const sha = execSync("git rev-parse HEAD", { cwd: workdir }).toString().trim();
		execSync(`git checkout --detach ${sha} --quiet`, { cwd: workdir });

		const dispatcher = withMutatingCommand(projectInitCmd);
		const result = await dispatcher(["--name", "guard-test"]);
		const parsed = JSON.parse(result);

		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("DETACHED_HEAD");
	});
});
