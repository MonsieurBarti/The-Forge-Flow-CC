import { beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";

describe("InMemoryGitOps — S03 extensions", () => {
	let git: InMemoryGitOps;
	beforeEach(() => {
		git = new InMemoryGitOps();
	});

	it("createOrphanWorktree should create branch without parent history", async () => {
		const r = await git.createOrphanWorktree("/tmp/wt", "tff-state/main");
		expect(isOk(r)).toBe(true);
		expect(git.hasBranch("tff-state/main")).toBe(true);
	});

	it("checkoutWorktree should succeed for existing branch", async () => {
		await git.createBranch("tff-state/main", "main");
		const r = await git.checkoutWorktree("/tmp/wt", "tff-state/main");
		expect(isOk(r)).toBe(true);
	});

	it("checkoutWorktree should fail for non-existing branch", async () => {
		const r = await git.checkoutWorktree("/tmp/wt", "tff-state/missing");
		expect(isOk(r)).toBe(false);
	});

	it("branchExists should return true for existing branch", async () => {
		const r = await git.branchExists("main");
		expect(isOk(r) && r.data).toBe(true);
	});

	it("branchExists should return false for non-existing branch", async () => {
		const r = await git.branchExists("nope");
		expect(isOk(r) && r.data).toBe(false);
	});

	it("deleteBranch should remove a branch", async () => {
		await git.createBranch("temp", "main");
		const r = await git.deleteBranch("temp");
		expect(isOk(r)).toBe(true);
		expect(git.hasBranch("temp")).toBe(false);
	});

	it("pruneWorktrees should succeed", async () => {
		const r = await git.pruneWorktrees();
		expect(isOk(r)).toBe(true);
	});

	it("lsTree should return stored files", async () => {
		git.setTreeFiles("tff-state/main", [".tff-cc/state.db", ".tff-cc/PROJECT.md"]);
		const r = await git.lsTree("tff-state/main");
		expect(isOk(r) && r.data).toEqual([".tff-cc/state.db", ".tff-cc/PROJECT.md"]);
	});

	it("extractFile should return stored buffer", async () => {
		const buf = Buffer.from("hello");
		git.setFileContent("tff-state/main", ".tff-cc/PROJECT.md", buf);
		const r = await git.extractFile("tff-state/main", ".tff-cc/PROJECT.md");
		expect(isOk(r) && r.data).toEqual(buf);
	});

	it("detectDefaultBranch should return main", async () => {
		const r = await git.detectDefaultBranch();
		expect(isOk(r) && r.data).toBe("main");
	});

	it("commit creates a commit ref and appends to commits", async () => {
		const r = await git.commit("feat: add thing", ["src/thing.ts"]);
		expect(isOk(r)).toBe(true);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.data.message).toBe("feat: add thing");
		expect(git.getCommits()).toHaveLength(1);
	});

	it("revert creates a revert commit ref", async () => {
		const r = await git.revert("abc1234");
		expect(isOk(r)).toBe(true);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.data.message).toContain("Revert");
		expect(git.getCommits()).toHaveLength(1);
	});

	it("merge succeeds", async () => {
		const r = await git.merge("feature/x", "main");
		expect(isOk(r)).toBe(true);
	});

	it("getCurrentBranch returns the current branch", async () => {
		const r = await git.getCurrentBranch();
		expect(isOk(r) && r.data).toBe("main");
	});

	it("getHeadSha returns the current HEAD sha", async () => {
		const r = await git.getHeadSha();
		expect(isOk(r)).toBe(true);
		if (!isOk(r)) throw new Error("expected ok");
		expect(typeof r.data).toBe("string");
	});

	it("pushBranch succeeds", async () => {
		const r = await git.pushBranch("main");
		expect(isOk(r)).toBe(true);
	});

	it("fetchBranch succeeds", async () => {
		const r = await git.fetchBranch("main", "origin");
		expect(isOk(r)).toBe(true);
	});

	it("extractFile returns NOT_FOUND error for missing file", async () => {
		const r = await git.extractFile("refs/missing", "some/file.ts");
		expect(isOk(r)).toBe(false);
		if (isOk(r)) throw new Error("expected error");
		expect(r.error.code).toBe("NOT_FOUND");
	});

	it("reset restores initial state", async () => {
		await git.commit("first", []);
		git.reset();
		expect(git.getCommits()).toHaveLength(0);
		expect(git.hasBranch("main")).toBe(true);
	});
});
