import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	computeSha,
	readManifest,
	writeManifest,
} from "../../src/application/skills/baseline-registry.js";
import { skillsApproveCmd } from "../../src/cli/commands/skills-approve.cmd.js";

describe("skills:approve round-trip", () => {
	let tmp: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-approve-int-"));
		execSync("git init --quiet", { cwd: tmp });
		execSync("git config user.email test@tff.invalid", { cwd: tmp });
		execSync("git config user.name test", { cwd: tmp });
		execSync("git config commit.gpgsign false", { cwd: tmp });

		fs.mkdirSync(path.join(tmp, "skills", "foo"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "foo v1\n");
		execSync("git add .", { cwd: tmp });
		execSync('git commit -m "initial" --quiet', { cwd: tmp });

		const seedSha = execSync("git rev-parse HEAD", { cwd: tmp, encoding: "utf8" }).trim();
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: computeSha("foo v1\n"),
					originalCommitSha: seedSha,
					approvedAt: "2026-04-20T00:00:00.000Z",
					refinementId: null,
				},
			},
		});
		execSync("git add skills/skill-baselines.json", { cwd: tmp });
		execSync('git commit -m "baseline" --quiet', { cwd: tmp });

		// Simulate a content update already committed (clean tree).
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "foo v2\n");
		execSync("git add skills/foo/SKILL.md", { cwd: tmp });
		execSync('git commit -m "update foo" --quiet', { cwd: tmp });

		process.chdir(tmp);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("updates the manifest row and echoes reason/shaBefore/shaAfter", async () => {
		const out = await skillsApproveCmd(["--id", "foo", "--reason", "integration test reason"]);
		const parsed = JSON.parse(out) as {
			ok: boolean;
			data: {
				skillId: string;
				reason: string;
				shaBefore: string;
				shaAfter: string;
				noop: boolean;
			};
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.skillId).toBe("foo");
		expect(parsed.data.reason).toBe("integration test reason");
		expect(parsed.data.shaAfter).toBe(computeSha("foo v2\n"));
		expect(parsed.data.noop).toBe(false);

		const after = readManifest(tmp);
		expect(after.skills.foo.sha256).toBe(computeSha("foo v2\n"));
	});

	it("refuses when the target file has uncommitted changes", async () => {
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "foo DIRTY\n");
		const out = await skillsApproveCmd(["--id", "foo", "--reason", "should fail"]);
		const parsed = JSON.parse(out) as {
			ok: boolean;
			error?: { message: string };
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error?.message).toContain("uncommitted changes");
	});
});
