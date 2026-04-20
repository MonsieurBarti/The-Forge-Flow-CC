import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../../../src/domain/result.js";
import { GitSliceMergeLookup } from "../../../../../src/infrastructure/adapters/git/git-slice-merge-lookup.js";

describe("GitSliceMergeLookup", () => {
	it("returns the first matching merge commit SHA", async () => {
		const runner = async () =>
			`${[
				`abc1234567890abcdef1234567890abcdef1234\u0000feat: land M01-S02 auth flow`,
				`def5678901234abcdef5678901234abcdef5678\u0000chore: ref M01-S02 in changelog`,
			].join("\n")}\n`;
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
		const runner = async () =>
			`abc1234567890abcdef1234567890abcdef1234\u0000feat: land M01-S02 auth flow\n`;
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

	it("skips commits whose subject matches a longer slice label (M01-S02 vs M01-S020)", async () => {
		const runner = async () =>
			`${[
				`aaa1111111111111111111111111111111111111\u0000feat: land M01-S020 unrelated`,
				`bbb2222222222222222222222222222222222222\u0000feat: land M01-S02 auth flow`,
			].join("\n")}\n`;
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data).toBe("bbb2222222222222222222222222222222222222");
	});

	it("returns the oldest matching commit when multiple messages mention the label", async () => {
		const runner = async () =>
			`${[
				`aaa1111111111111111111111111111111111111\u0000feat(routing): land M01-S02 auth flow`,
				`bbb2222222222222222222222222222222222222\u0000revert: rolling back M01-S02 due to regression`,
				`ccc3333333333333333333333333333333333333\u0000docs: mention M01-S02 in changelog`,
			].join("\n")}\n`;
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02");
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data).toBe("aaa1111111111111111111111111111111111111");
	});

	it("returns PRECONDITION_VIOLATION when candidates all fail the word-boundary test", async () => {
		// All candidates have the label as part of a longer token.
		const runner = async () =>
			`aaa1111111111111111111111111111111111111\u0000feat: land M01-S0200 experimental\n`;
		const lookup = new GitSliceMergeLookup({ run: runner, defaultBranch: "main", cwd: "/x" });
		const res = await lookup.findMergeCommit("M01-S02");
		expect(isErr(res)).toBe(true);
	});
});
