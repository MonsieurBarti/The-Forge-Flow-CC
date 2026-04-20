import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../../../src/domain/result.js";
import { GitDiffReader } from "../../../../../src/infrastructure/adapters/git/git-diff-reader.js";

const VALID_SHA = "abc1234567890abcdef1234567890abcdef1234";

describe("GitDiffReader", () => {
	it("parses diffstat and returns patch under the cap", async () => {
		const runner = async (_cmd: string, args: string[]) => {
			if (args[0] === "show" && args.includes("--stat")) {
				return " 2 files changed, 40 insertions(+), 5 deletions(-)\n";
			}
			return "diff --git a/x b/x\n@@...";
		};
		const reader = new GitDiffReader({ run: runner, cwd: "/x" });
		const res = await reader.readMergeDiff(VALID_SHA, 1024);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.files_changed).toBe(2);
		expect(res.data.insertions).toBe(40);
		expect(res.data.deletions).toBe(5);
		expect(res.data.truncated).toBe(false);
	});

	it("truncates the patch at maxPatchBytes and marks truncated=true", async () => {
		const long = "x".repeat(500);
		const runner = async (_cmd: string, args: string[]) => {
			if (args[0] === "show" && args.includes("--stat")) {
				return " 1 file changed, 10 insertions(+), 0 deletions(-)\n";
			}
			return long;
		};
		const reader = new GitDiffReader({ run: runner, cwd: "/x" });
		const res = await reader.readMergeDiff(VALID_SHA, 100);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.truncated).toBe(true);
		expect(res.data.patch.length).toBeLessThanOrEqual(100 + 64); // patch + truncation footer
		expect(res.data.patch).toContain("[truncated");
	});

	it("rejects malformed SHAs", async () => {
		const runner = async () => "";
		const reader = new GitDiffReader({ run: runner, cwd: "/x" });
		const res = await reader.readMergeDiff("not-hex", 1024);
		expect(isErr(res)).toBe(true);
	});

	it("propagates runner errors", async () => {
		const runner = async () => {
			throw new Error("boom");
		};
		const reader = new GitDiffReader({ run: runner, cwd: "/x" });
		const res = await reader.readMergeDiff(VALID_SHA, 1024);
		expect(isErr(res)).toBe(true);
	});

	it("handles zero-insertion stat lines", async () => {
		const runner = async (_cmd: string, args: string[]) => {
			if (args[0] === "show" && args.includes("--stat")) {
				return " 1 file changed, 3 deletions(-)\n";
			}
			return "diff...";
		};
		const reader = new GitDiffReader({ run: runner, cwd: "/x" });
		const res = await reader.readMergeDiff(VALID_SHA, 1024);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.insertions).toBe(0);
		expect(res.data.deletions).toBe(3);
	});
});
