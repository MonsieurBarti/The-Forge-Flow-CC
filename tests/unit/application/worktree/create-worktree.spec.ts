import { beforeEach, describe, expect, it } from "vitest";
import { createWorktreeUseCase } from "../../../../src/application/worktree/create-worktree.js";
import type { Milestone } from "../../../../src/domain/entities/milestone.js";
import type { Slice } from "../../../../src/domain/entities/slice.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";

describe("createWorktreeUseCase", () => {
	let gitOps: InMemoryGitOps;
	beforeEach(() => {
		gitOps = new InMemoryGitOps();
	});

	const makeSlice = (overrides: Partial<Slice> = {}): Slice => ({
		id: "a1b2c3d4-5678-90ab-cdef-123456789abc",
		milestoneId: "m-uuid-1234",
		kind: "milestone",
		number: 1,
		title: "Test Slice",
		status: "discussing",
		createdAt: new Date(),
		...overrides,
	});

	const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
		id: "m-uuid-1234",
		projectId: "p-uuid-1234",
		name: "Test Milestone",
		number: 1,
		status: "open",
		branch: "milestone/12345678",
		createdAt: new Date(),
		...overrides,
	});

	it("milestone-bound slice: uses milestone branch + UUID-prefix branch name + M##-S## label", async () => {
		const slice = makeSlice({ number: 3 });
		const milestone = makeMilestone({ number: 1 });
		const result = await createWorktreeUseCase(
			{
				slice,
				milestone,
				startPoint: milestone.branch,
				branchName: "slice/a1b2c3d4",
			},
			{ gitOps },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.branchName).toBe("slice/a1b2c3d4");
			expect(result.data.worktreePath).toBe(".tff-cc/worktrees/M01-S03");
			expect(gitOps.hasBranch("slice/a1b2c3d4")).toBe(true);
		}
	});

	it("quick slice with custom branch name: forks from supplied base branch, label is Q-##", async () => {
		const slice = makeSlice({
			milestoneId: undefined,
			kind: "quick",
			number: 7,
			baseBranch: "main",
			branchName: "fix/payload",
		});
		const result = await createWorktreeUseCase(
			{
				slice,
				milestone: undefined,
				startPoint: "main",
				branchName: "fix/payload",
			},
			{ gitOps },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.branchName).toBe("fix/payload");
			expect(result.data.worktreePath).toBe(".tff-cc/worktrees/Q-07");
			expect(gitOps.hasBranch("fix/payload")).toBe(true);
		}
	});

	it("debug slice with default branch name: label is D-##", async () => {
		const slice = makeSlice({
			id: "12345678-aaaa-bbbb-cccc-ddddeeeeffff",
			milestoneId: undefined,
			kind: "debug",
			number: 3,
			baseBranch: "feature/x",
		});
		const result = await createWorktreeUseCase(
			{
				slice,
				milestone: undefined,
				startPoint: "feature/x",
				branchName: "slice/12345678",
			},
			{ gitOps },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.branchName).toBe("slice/12345678");
			expect(result.data.worktreePath).toBe(".tff-cc/worktrees/D-03");
			expect(gitOps.hasBranch("slice/12345678")).toBe(true);
		}
	});
});
