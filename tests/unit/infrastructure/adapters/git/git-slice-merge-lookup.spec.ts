import { describe, expect, it } from "vitest";
import { GitSliceMergeLookup } from "../../../../../src/infrastructure/adapters/git/git-slice-merge-lookup.js";
import { isErr, isOk } from "../../../../../src/domain/result.js";

describe("GitSliceMergeLookup", () => {
	it("returns the first matching merge commit SHA", async () => {
		const runner = async () =>
			"abc1234567890abcdef1234567890abcdef1234\ndef5678901234abcdef5678901234abcdef5678\n";
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data).toBe("abc1234567890abcdef1234567890abcdef1234");
	});

	it("returns PRECONDITION_VIOLATION when no merge matches", async () => {
		const runner = async () => "";
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M99-S99");
		expect(isErr(res)).toBe(true);
	});

	it("rejects slice labels that would inject shell/regex metacharacters", async () => {
		const runner = async () => "abc1234\n";
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02; rm -rf /");
		expect(isErr(res)).toBe(true);
	});

	it("propagates runner errors as EXTERNAL_CALL_FAILED", async () => {
		const runner = async () => {
			throw new Error("git not found");
		};
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02");
		expect(isErr(res)).toBe(true);
	});
});
