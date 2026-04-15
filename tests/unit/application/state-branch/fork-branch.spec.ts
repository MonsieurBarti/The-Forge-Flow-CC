import { beforeEach, describe, expect, it } from "vitest";
import { forkBranchUseCase } from "../../../../src/application/state-branch/fork-branch.js";
import { isOk } from "../../../../src/domain/result.js";
import { GitStateBranchAdapter } from "../../../../src/infrastructure/adapters/git/git-state-branch.adapter.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";

describe("forkBranchUseCase", () => {
	let gitOps: InMemoryGitOps;
	let stateBranch: GitStateBranchAdapter;

	beforeEach(async () => {
		gitOps = new InMemoryGitOps();
		stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
		await stateBranch.createRoot();
	});

	it("should fork a child state branch from parent", async () => {
		const r = await forkBranchUseCase(
			{ codeBranch: "milestone/M01", parentStateBranch: "tff-state/main" },
			{ stateBranch },
		);
		expect(isOk(r)).toBe(true);
		expect(gitOps.hasBranch("tff-state/milestone/M01")).toBe(true);
	});
});
