import { beforeEach, describe, expect, it } from "vitest";
import { listWorktreesUseCase } from "../../../../src/application/worktree/list-worktrees.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";

describe("listWorktreesUseCase", () => {
	let gitOps: InMemoryGitOps;
	beforeEach(() => {
		gitOps = new InMemoryGitOps();
	});

	it("should list all worktrees", async () => {
		await gitOps.createWorktree(".tff-cc/worktrees/M01-S01", "slice/M01-S01");
		await gitOps.createWorktree(".tff-cc/worktrees/M01-S02", "slice/M01-S02");

		const result = await listWorktreesUseCase({ gitOps });
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(2);
		}
	});
});
