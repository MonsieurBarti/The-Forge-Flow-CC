import { beforeEach, describe, expect, it } from "vitest";
import { mergeBranchUseCase } from "../../../src/application/state-branch/merge-branch.js";
import { isOk } from "../../src/../src/domain/result.js";
import { STATE_SNAPSHOT_VERSION } from "../../src/../src/domain/value-objects/state-snapshot.js";
import { GitStateBranchAdapter } from "../../src/../src/infrastructure/adapters/git/git-state-branch.adapter.js";
import { InMemoryGitOps } from "../../src/../src/infrastructure/testing/in-memory-git-ops.js";

const createStateSnapshot = (): string => {
	const snapshot = {
		version: STATE_SNAPSHOT_VERSION,
		exportedAt: new Date().toISOString(),
		project: {
			name: "P",
			vision: "V",
			createdAt: new Date(),
		},
		milestones: [
			{
				id: "M01",
				number: 1,
				name: "M1",
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
		slices: [
			{
				id: "M01-S01",
				milestoneId: "M01",
				number: 1,
				title: "S1",
				tier: "F-lite",
				status: "open",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
		tasks: [],
		dependencies: [],
		workflowSession: null,
		reviews: [],
	};
	return JSON.stringify(snapshot, null, 2);
};

describe("mergeBranchUseCase", () => {
	let gitOps: InMemoryGitOps;
	let stateBranch: GitStateBranchAdapter;

	beforeEach(async () => {
		gitOps = new InMemoryGitOps();
		stateBranch = new GitStateBranchAdapter(gitOps, "/tmp/repo");
		await stateBranch.createRoot();
		await stateBranch.fork("slice/M01-S01", "tff-state/main");

		// Set up JSON state-snapshot content for merge extraction
		const snapshotJson = createStateSnapshot();
		gitOps.setFileContent("tff-state/main", ".tff/state-snapshot.json", Buffer.from(snapshotJson));
		gitOps.setFileContent(
			"tff-state/slice/M01-S01",
			".tff/state-snapshot.json",
			Buffer.from(snapshotJson),
		);
		gitOps.setTreeFiles("tff-state/slice/M01-S01", [".tff/state-snapshot.json"]);
	});

	it("should merge child into parent and delete child branch", async () => {
		const r = await mergeBranchUseCase(
			{ childCodeBranch: "slice/M01-S01", parentCodeBranch: "main", sliceId: "M01-S01" },
			{ stateBranch },
		);
		expect(isOk(r)).toBe(true);
	});
});
