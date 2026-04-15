import { beforeEach, describe, expect, it } from "vitest";
import { createRootBranchUseCase } from "../../../../src/application/state-branch/create-root-branch.js";
import { isOk } from "../../../../src/domain/result.js";
import { GitStateBranchAdapter } from "../../../../src/infrastructure/adapters/git/git-state-branch.adapter.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";

describe("createRootBranchUseCase", () => {
	let gitOps: InMemoryGitOps;

	beforeEach(() => {
		gitOps = new InMemoryGitOps();
	});

	it("should create root state branch", async () => {
		const stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
		const r = await createRootBranchUseCase({}, { stateBranch });
		expect(isOk(r)).toBe(true);
		expect(gitOps.hasBranch("tff-state/main")).toBe(true);
	});

	it("should fail if root already exists", async () => {
		const stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
		await createRootBranchUseCase({}, { stateBranch });
		const r = await createRootBranchUseCase({}, { stateBranch });
		expect(isOk(r)).toBe(false);
	});
});
