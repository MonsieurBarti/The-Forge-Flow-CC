import { beforeEach, describe, expect, it } from "vitest";
import { createWorktreeUseCase } from "../../../../src/application/worktree/create-worktree.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";
import type { Slice } from "../../../../src/domain/entities/slice.js";

describe("createWorktreeUseCase", () => {
	let gitOps: InMemoryGitOps;
	beforeEach(() => {
		gitOps = new InMemoryGitOps();
	});

	// Helper to create a slice-like object for testing
	const makeSlice = (overrides: Partial<Slice> = {}): Slice => ({
		id: "a1b2c3d4-5678-90ab-cdef-123456789abc",
		milestoneId: "m-uuid-1234",
		number: 1,
		title: "Test Slice",
		status: "discussing",
		createdAt: new Date(),
		...overrides,
	});

	it("should create a worktree with UUID-based branch name", async () => {
		const slice = makeSlice();
		const result = await createWorktreeUseCase({ slice, milestoneNumber: 1 }, { gitOps });

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Branch name uses 8-char UUID prefix
			expect(result.data.branchName).toBe("slice/a1b2c3d4");
			expect(gitOps.hasBranch("slice/a1b2c3d4")).toBe(true);
		}
	});

	it("should use label-based worktree path", async () => {
		const slice = makeSlice({ number: 5 });
		const result = await createWorktreeUseCase({ slice, milestoneNumber: 2 }, { gitOps });

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Worktree path uses M##-S## format
			expect(result.data.worktreePath).toBe(".tff/worktrees/M02-S05");
		}
	});

	it("should use slice id for branch name, not label", async () => {
		const slice = makeSlice({ id: "12345678-aaaa-bbbb-cccc-ddddeeeeffff", number: 10 });
		const result = await createWorktreeUseCase({ slice, milestoneNumber: 3 }, { gitOps });

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.branchName).toBe("slice/12345678");
			expect(result.data.worktreePath).toBe(".tff/worktrees/M03-S10");
		}
	});
});
