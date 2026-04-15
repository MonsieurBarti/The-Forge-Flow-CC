import { beforeEach, describe, expect, it } from "vitest";
import { createMilestoneUseCase } from "../../../../src/application/milestone/create-milestone.js";
import type { DomainError } from "../../../../src/domain/errors/domain-error.js";
import type { StateBranchPort } from "../../../../src/domain/ports/state-branch.port.js";
import { isOk, Ok, type Result } from "../../../../src/domain/result.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";
import { InMemoryGitOps } from "../../../../src/infrastructure/testing/in-memory-git-ops.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

class InMemoryStateBranch implements StateBranchPort {
	private branches = new Set<string>();
	forkCalls: Array<{ codeBranch: string; parentStateBranch: string }> = [];

	async createRoot(): Promise<Result<void, DomainError>> {
		this.branches.add("tff-state/main");
		return Ok(undefined);
	}
	async fork(codeBranch: string, parentStateBranch: string): Promise<Result<void, DomainError>> {
		this.forkCalls.push({ codeBranch, parentStateBranch });
		this.branches.add(`tff-state/${codeBranch}`);
		return Ok(undefined);
	}
	async sync(_codeBranch: string, _message: string): Promise<Result<void, DomainError>> {
		return Ok(undefined);
	}
	async restore(_codeBranch: string, _targetDir: string): Promise<Result<null, DomainError>> {
		return Ok(null);
	}
	async merge(
		_child: string,
		_parent: string,
		_sliceId: string,
	): Promise<Result<{ entitiesMerged: number; artifactsCopied: number }, DomainError>> {
		return Ok({ entitiesMerged: 0, artifactsCopied: 0 });
	}
	async deleteBranch(_stateBranch: string): Promise<Result<void, DomainError>> {
		return Ok(undefined);
	}
	async exists(codeBranch: string): Promise<Result<boolean, DomainError>> {
		return Ok(this.branches.has(`tff-state/${codeBranch}`));
	}
	hasBranch(name: string): boolean {
		return this.branches.has(name);
	}
}

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

	it("should create a milestone with branch", async () => {
		const result = await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.milestone.name).toBe("MVP");
			expect(result.data.milestone.number).toBe(1);
			expect(gitOps.hasBranch("milestone/M01")).toBe(true);
		}
	});

	it("should create REQUIREMENTS.md stub", async () => {
		await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		expect(await artifactStore.exists(".tff/milestones/M01/REQUIREMENTS.md")).toBe(true);
	});
});

describe("createMilestoneUseCase — state branch fork", () => {
	let adapter: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;
	let gitOps: InMemoryGitOps;
	let stateBranch: InMemoryStateBranch;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.init();
		artifactStore = new InMemoryArtifactStore();
		gitOps = new InMemoryGitOps();
		stateBranch = new InMemoryStateBranch();
		adapter.saveProject({ name: "app", vision: "A great app" });
		stateBranch.createRoot();
	});

	it("should fork tff-state/milestone/M01 from tff-state/main", async () => {
		const result = await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps, stateBranch },
		);

		expect(isOk(result)).toBe(true);
		expect(stateBranch.hasBranch("tff-state/milestone/M01")).toBe(true);
		expect(stateBranch.forkCalls).toHaveLength(1);
		expect(stateBranch.forkCalls[0]).toEqual({
			codeBranch: "milestone/M01",
			parentStateBranch: "tff-state/main",
		});
	});

	it("should succeed without stateBranch in deps (backward compat)", async () => {
		const result = await createMilestoneUseCase(
			{ name: "MVP", number: 1 },
			{ milestoneStore: adapter, artifactStore, gitOps },
		);

		expect(isOk(result)).toBe(true);
	});
});
