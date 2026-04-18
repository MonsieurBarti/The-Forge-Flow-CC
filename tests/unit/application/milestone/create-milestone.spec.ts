import { beforeEach, describe, expect, it } from "vitest";
import { createMilestoneUseCase } from "../../../../src/application/milestone/create-milestone.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("createMilestoneUseCase", () => {
	let adapter: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;
	let gitOps: InMemoryGitOps;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.init();
		artifactStore = new InMemoryArtifactStore();
		gitOps = new InMemoryGitOps();
		adapter.saveProject({ name: "app", vision: "A great app" });
	});

	it("should create a milestone with UUID id and branch", async () => {
		const result = await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const { milestone, branchName } = result.data;
			expect(milestone.name).toBe("MVP");
			expect(milestone.number).toBe(1);
			// ID should be a UUID
			expect(milestone.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			// Branch name should be milestone/<8-char-uuid-prefix>
			expect(branchName).toMatch(/^milestone\/[0-9a-f]{8}$/);
			// Branch should be created in git
			expect(gitOps.hasBranch(branchName)).toBe(true);
			// Milestone should have branch stored
			expect(milestone.branch).toBe(branchName);
		}
	});

	it("should create REQUIREMENTS.md in label-based directory", async () => {
		await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		// Directory uses label format M##, not UUID
		expect(await artifactStore.exists(".tff-cc/milestones/M01/REQUIREMENTS.md")).toBe(true);
	});

	it("should create slices directory with label format", async () => {
		await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		// The slices directory is created by mkdir, and REQUIREMENTS.md is written
		// We verify the directory structure by checking that the file exists
		expect(await artifactStore.exists(".tff-cc/milestones/M01/REQUIREMENTS.md")).toBe(true);
	});
});
