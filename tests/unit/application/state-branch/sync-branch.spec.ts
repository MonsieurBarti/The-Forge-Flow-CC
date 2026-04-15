import { beforeEach, describe, expect, it } from "vitest";
import { syncBranchUseCase } from "../../../src/application/state-branch/sync-branch.js";
import { isOk } from "../../src/domain/result.js";
import { GitStateBranchAdapter } from "../../src/infrastructure/adapters/git/git-state-branch.adapter.js";
import { InMemoryGitOps } from "../../src/infrastructure/testing/in-memory-git-ops.js";

describe("syncBranchUseCase", () => {
	let stateBranch: GitStateBranchAdapter;

	beforeEach(async () => {
		const gitOps = new InMemoryGitOps();
		stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
		await stateBranch.createRoot();
	});

	it("should sync state to branch", async () => {
		const r = await syncBranchUseCase(
			{ codeBranch: "main", message: "sync after transition" },
			{ stateBranch },
		);
		expect(isOk(r)).toBe(true);
	});
});
