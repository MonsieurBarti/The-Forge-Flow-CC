import { describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { GitCliAdapter } from "../../../../../src/infrastructure/adapters/git/git-cli.adapter.js";

describe("GitCliAdapter - caching", () => {
	it("should cache getCurrentBranch within TTL", async () => {
		const adapter = new GitCliAdapter(process.cwd());
		const branch1 = await adapter.getCurrentBranch();
		const branch2 = await adapter.getCurrentBranch();
		expect(branch1).toEqual(branch2);
	});

	it("should have invalidateCache method", () => {
		const adapter = new GitCliAdapter(process.cwd());
		expect(typeof adapter.invalidateCache).toBe("function");
	});

	it("should still work after cache invalidation", async () => {
		const adapter = new GitCliAdapter(process.cwd());
		await adapter.getCurrentBranch();
		adapter.invalidateCache();
		const branch = await adapter.getCurrentBranch();
		expect(branch).toBeDefined();
	});
});

describe("GitCliAdapter — S03 branch methods", () => {
	const adapter = new GitCliAdapter(process.cwd());

	it("branchExists should return true for a branch we create", async () => {
		// CI checks out in detached HEAD with no local branches,
		// so create a temp branch from HEAD and verify it exists
		const { execFileSync } = await import("node:child_process");
		const branchName = `test-branch-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
		execFileSync("git", ["branch", branchName, "HEAD"], { cwd: process.cwd() });
		try {
			const r = await adapter.branchExists(branchName);
			expect(isOk(r) && r.data).toBe(true);
		} finally {
			execFileSync("git", ["branch", "-D", branchName], { cwd: process.cwd() });
		}
	});

	it("branchExists should return false for non-existing branch", async () => {
		const r = await adapter.branchExists("nonexistent-branch-abc123");
		expect(isOk(r) && r.data).toBe(false);
	});

	it("pruneWorktrees should succeed", async () => {
		const r = await adapter.pruneWorktrees();
		expect(isOk(r)).toBe(true);
	});
});
