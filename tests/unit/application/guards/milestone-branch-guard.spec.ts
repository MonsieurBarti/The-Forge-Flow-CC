import { describe, expect, it, vi } from "vitest";
import { assertNotOnMilestoneBranch } from "../../../../src/application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../../../src/domain/ports/git-ops.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import { Ok } from "../../../../src/domain/result.js";

const makeGit = (branch: string): GitOps =>
	({
		getCurrentBranch: vi.fn().mockResolvedValue(Ok(branch)),
	}) as unknown as GitOps;

const makeMilestoneStore = (
	milestones: { id: string; status: string; number: number; name: string }[],
): MilestoneStore =>
	({
		listMilestones: vi.fn().mockReturnValue(Ok(milestones)),
	}) as unknown as MilestoneStore;

const makeSliceStore = (slices: { milestoneId: string; status: string }[]): SliceStore =>
	({
		listSlices: vi
			.fn()
			.mockImplementation((mid?: string) =>
				Ok(slices.filter((s) => !mid || s.milestoneId === mid)),
			),
	}) as unknown as SliceStore;

describe("assertNotOnMilestoneBranch", () => {
	it("returns Ok when cwd branch is a slice branch", async () => {
		const git = makeGit("slice/abcd1234");
		const res = await assertNotOnMilestoneBranch(
			git,
			"slice:transition",
			makeSliceStore([]),
			makeMilestoneStore([]),
		);
		expect(res.ok).toBe(true);
	});

	it("returns Ok when cwd branch is not milestone-shaped", async () => {
		const git = makeGit("feature/whatever");
		const res = await assertNotOnMilestoneBranch(
			git,
			"task:close",
			makeSliceStore([]),
			makeMilestoneStore([]),
		);
		expect(res.ok).toBe(true);
	});

	it("returns violation on milestone branch with open slices", async () => {
		const milestones = [
			{ id: "12345678-aaaa-bbbb-cccc-dddddddddddd", status: "open", number: 1, name: "M1" },
		];
		const slices = [{ milestoneId: milestones[0].id, status: "executing" }];
		const git = makeGit("milestone/12345678");
		const res = await assertNotOnMilestoneBranch(
			git,
			"review:record",
			makeSliceStore(slices),
			makeMilestoneStore(milestones),
		);
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.error.code).toBe("REFUSED_ON_MILESTONE_BRANCH");
		expect(res.error.message).toContain("milestone/12345678");
		expect(res.error.message).toContain("1"); // count of open slices
	});

	it("returns Ok on milestone branch with all slices closed", async () => {
		const milestones = [
			{ id: "12345678-aaaa-bbbb-cccc-dddddddddddd", status: "open", number: 1, name: "M1" },
		];
		const slices = [{ milestoneId: milestones[0].id, status: "closed" }];
		const git = makeGit("milestone/12345678");
		const res = await assertNotOnMilestoneBranch(
			git,
			"slice:transition",
			makeSliceStore(slices),
			makeMilestoneStore(milestones),
		);
		expect(res.ok).toBe(true);
	});

	it("returns Ok if milestone branch prefix doesn't match any milestone", async () => {
		const git = makeGit("milestone/deadbeef");
		const res = await assertNotOnMilestoneBranch(
			git,
			"task:claim",
			makeSliceStore([]),
			makeMilestoneStore([]),
		);
		expect(res.ok).toBe(true);
	});
});
