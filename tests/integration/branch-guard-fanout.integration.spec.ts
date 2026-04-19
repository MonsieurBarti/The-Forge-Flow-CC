import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const writers = [
	"milestone:create", "milestone:close",
	"slice:create", "slice:transition", "slice:close",
	"task:claim", "task:close",
	"dep:add", "sync:state",
	"worktree:create", "worktree:delete",
	"review:record", "routing:decide",
	"checkpoint:save", "observe:record",
];

let repo: string;
const CLI = join(process.cwd(), "dist/cli/index.js");

const runCli = (cmd: string, args: string[] = []): string => {
	try {
		return execFileSync("node", [CLI, cmd, ...args], {
			cwd: repo,
			encoding: "utf8",
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch (e) {
		const err = e as { stdout?: string };
		return err.stdout ?? "";
	}
};

describe("branch-guard fan-out", () => {
	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), "tff-branch-guard-"));
		execFileSync("git", ["init", "-b", "main"], { cwd: repo });
		execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
		execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
		execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
	});
	afterEach(() => rmSync(repo, { recursive: true, force: true }));

	it.each(writers)("refuses %s on default branch", (cmd) => {
		const out = runCli(cmd);
		const lines = out.trim().split("\n").filter(Boolean);
		const parsed = JSON.parse(lines[lines.length - 1]);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
	});

	it("project:init is not refused (exempt)", () => {
		const out = runCli("project:init", ["--name", "x", "--vision", "y"]);
		const lines = out.trim().split("\n").filter(Boolean);
		const parsed = JSON.parse(lines[lines.length - 1]);
		if (!parsed.ok) {
			expect(parsed.error.code).not.toBe("REFUSED_ON_DEFAULT_BRANCH");
		}
	});
});
