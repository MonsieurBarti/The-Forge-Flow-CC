import { beforeEach, describe, expect, it } from "vitest";
import { restoreBranchUseCase } from "../../../src/application/state-branch/restore-branch.js";
import { isOk } from "../../src/domain/result.js";
import { GitStateBranchAdapter } from "../../src/infrastructure/adapters/git/git-state-branch.adapter.js";
import { InMemoryGitOps } from "../../src/infrastructure/testing/in-memory-git-ops.js";

describe("restoreBranchUseCase", () => {
	let gitOps: InMemoryGitOps;
	let stateBranch: GitStateBranchAdapter;

	beforeEach(async () => {
		gitOps = new InMemoryGitOps();
		stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
	});

	it("should return null when no state branch exists", async () => {
		const r = await restoreBranchUseCase(
			{ codeBranch: "main", targetDir: "/tmp/target" },
			{ stateBranch },
		);
		expect(isOk(r) && r.data).toBeNull();
	});

	it("should restore from existing state branch", async () => {
		await stateBranch.createRoot();
		gitOps.setTreeFiles("tff-state/main", [".tff/PROJECT.md"]);
		gitOps.setFileContent("tff-state/main", ".tff/PROJECT.md", Buffer.from("# P"));

		const r = await restoreBranchUseCase(
			{ codeBranch: "main", targetDir: "/tmp/target" },
			{ stateBranch },
		);
		expect(isOk(r)).toBe(true);
		if (isOk(r) && r.data) {
			expect(r.data.filesRestored).toBe(1);
		}
	});
});
