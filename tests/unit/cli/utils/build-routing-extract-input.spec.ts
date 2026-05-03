import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
	buildRoutingExtractInput,
	type GitRunner,
} from "../../../../src/cli/utils/build-routing-extract-input.js";
import type { Slice } from "../../../../src/domain/entities/slice.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import { Ok } from "../../../../src/domain/result.js";

const stubMilestoneStore = (overrides: Partial<MilestoneStore> = {}): MilestoneStore => {
	return {
		getMilestone: vi.fn(),
		getMilestoneByNumber: vi.fn(),
		listMilestones: vi.fn(),
		createMilestone: vi.fn(),
		updateMilestone: vi.fn(),
		closeMilestone: vi.fn(),
		setMilestoneAuditStatus: vi.fn(),
		...overrides,
	} as unknown as MilestoneStore;
};

const stubSliceStore = (overrides: Partial<SliceStore> = {}): SliceStore => {
	return {
		createSlice: vi.fn(),
		getSlice: vi.fn(),
		getSliceByNumbers: vi.fn(),
		listSlices: vi.fn(),
		listSlicesByKind: vi.fn(),
		updateSlice: vi.fn(),
		transitionSlice: vi.fn(),
		archiveSlice: vi.fn(),
		...overrides,
	} as unknown as SliceStore;
};

const fakeSlice = (overrides: Partial<Slice> = {}): Slice =>
	({
		id: "slice-uuid-1",
		milestoneId: "milestone-uuid-1",
		kind: "milestone",
		number: 1,
		title: "Test slice",
		status: "executing",
		baseBranch: undefined,
		branchName: undefined,
		createdAt: new Date(),
		...overrides,
	}) as Slice;

describe("buildRoutingExtractInput", () => {
	it("returns the legacy stub when the slice label is malformed", async () => {
		const sliceStore = stubSliceStore();
		const milestoneStore = stubMilestoneStore();
		const runGit: GitRunner = vi.fn();

		const result = await buildRoutingExtractInput("not-a-slice", {
			sliceStore,
			milestoneStore,
			runGit,
			projectRoot: "/repo",
		});

		expect(result).toEqual({
			slice_id: "not-a-slice",
			description: "slice not-a-slice",
			affected_files: [],
		});
		expect(sliceStore.getSliceByNumbers).not.toHaveBeenCalled();
		expect(runGit).not.toHaveBeenCalled();
	});

	it("returns the stub when the slice is unknown", async () => {
		const sliceStore = stubSliceStore({
			getSliceByNumbers: vi.fn().mockReturnValue(Ok(null)),
		});
		const milestoneStore = stubMilestoneStore();
		const runGit: GitRunner = vi.fn();

		const result = await buildRoutingExtractInput("M01-S01", {
			sliceStore,
			milestoneStore,
			runGit,
			projectRoot: "/repo",
		});

		expect(result.affected_files).toEqual([]);
		expect(result.spec_path).toBeUndefined();
		expect(runGit).not.toHaveBeenCalled();
	});

	it("populates affected_files from git diff and points spec_path at the slice dir", async () => {
		const slice = fakeSlice({ baseBranch: "main" });
		const sliceStore = stubSliceStore({
			getSliceByNumbers: vi.fn().mockReturnValue(Ok(slice)),
		});
		const milestoneStore = stubMilestoneStore();
		const runGit: GitRunner = vi
			.fn<Parameters<GitRunner>, ReturnType<GitRunner>>()
			.mockResolvedValue(
				"src/foo.ts\nsrc/bar.ts\nsrc/auth/baz.ts\n\nsrc/qux.ts\nsrc/quux.ts\nsrc/corge.ts\n",
			);

		const result = await buildRoutingExtractInput("M01-S01", {
			sliceStore,
			milestoneStore,
			runGit,
			projectRoot: "/repo",
		});

		expect(runGit).toHaveBeenCalledWith("git", ["diff", "--name-only", "main...HEAD"], {
			cwd: "/repo",
		});
		expect(result.affected_files).toEqual([
			"src/foo.ts",
			"src/bar.ts",
			"src/auth/baz.ts",
			"src/qux.ts",
			"src/quux.ts",
			"src/corge.ts",
		]);
		expect(result.affected_files.length).toBeGreaterThanOrEqual(5); // → medium tier downstream
		expect(result.spec_path).toBe(
			join("/repo", ".tff-cc", "milestones", "M01", "slices", "M01-S01", "SPEC.md"),
		);
	});

	it("falls back to the milestone branch when slice has no explicit base", async () => {
		const slice = fakeSlice({ baseBranch: undefined, milestoneId: "ms-uuid" });
		const sliceStore = stubSliceStore({
			getSliceByNumbers: vi.fn().mockReturnValue(Ok(slice)),
		});
		const milestoneStore = stubMilestoneStore({
			getMilestone: vi.fn().mockReturnValue(
				Ok({
					id: "ms-uuid",
					name: "M",
					number: 1,
					status: "open",
					branch: "milestone/abc12345",
					createdAt: new Date(),
				}),
			),
		});
		const runGit: GitRunner = vi
			.fn<Parameters<GitRunner>, ReturnType<GitRunner>>()
			.mockResolvedValue("src/a.ts\n");

		const result = await buildRoutingExtractInput("M01-S01", {
			sliceStore,
			milestoneStore,
			runGit,
			projectRoot: "/repo",
		});

		expect(runGit).toHaveBeenCalledWith(
			"git",
			["diff", "--name-only", "milestone/abc12345...HEAD"],
			{ cwd: "/repo" },
		);
		expect(result.affected_files).toEqual(["src/a.ts"]);
	});

	it("returns empty affected_files when git fails (e.g. missing branch)", async () => {
		const slice = fakeSlice({ baseBranch: "main" });
		const sliceStore = stubSliceStore({
			getSliceByNumbers: vi.fn().mockReturnValue(Ok(slice)),
		});
		const milestoneStore = stubMilestoneStore();
		const runGit: GitRunner = vi
			.fn<Parameters<GitRunner>, ReturnType<GitRunner>>()
			.mockRejectedValue(new Error("fatal: ambiguous argument 'main'"));

		const result = await buildRoutingExtractInput("M01-S01", {
			sliceStore,
			milestoneStore,
			runGit,
			projectRoot: "/repo",
		});

		expect(result.affected_files).toEqual([]);
		// spec_path is still set so the keyword scan can still pick up SPEC.md
		expect(result.spec_path).toBe(
			join("/repo", ".tff-cc", "milestones", "M01", "slices", "M01-S01", "SPEC.md"),
		);
	});
});
