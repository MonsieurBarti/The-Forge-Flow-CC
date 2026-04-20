/**
 * worktree:create roundtrip test
 *
 * Verifies that after creating a git worktree, `.tff-project-id` is written
 * into the new worktree directory so subsequent `tff-tools` invocations
 * inside it never mint a divergent UUID.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- module mocks (must be hoisted before dynamic imports) ---
vi.mock("../../../src/application/worktree/create-worktree.js");
vi.mock("../../../src/infrastructure/adapters/sqlite/create-state-stores.js");

import { createWorktreeUseCase } from "../../../src/application/worktree/create-worktree.js";
import { createClosableStateStoresUnchecked } from "../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

const mockedCreateWorktreeUseCase = vi.mocked(createWorktreeUseCase);
const mockedCreateClosableStateStoresUnchecked = vi.mocked(createClosableStateStoresUnchecked);

describe("worktree:create — project id persistence", () => {
	let tmpDir: string;
	let homeDir: string;
	let worktreeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	const PROJECT_UUID = "a1b2c3d4-e5f6-4000-8000-aabbccddeeff";
	const SLICE_UUID = "11111111-1111-4000-8000-000000000001";
	const MILESTONE_UUID = "22222222-2222-4000-8000-000000000002";

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "tff-worktree-roundtrip-"));
		homeDir = mkdtempSync(join(tmpdir(), "tff-home-roundtrip-"));
		worktreeDir = join(tmpDir, ".tff-cc", "worktrees", "M01-S01");

		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;
		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		// Write .tff-project-id in primary repo root
		writeFileSync(join(tmpDir, ".tff-project-id"), `${PROJECT_UUID}\n`);

		// Ensure the home dir structure exists so createTffCcSymlink can resolve target
		mkdirSync(join(homeDir, PROJECT_UUID), { recursive: true });

		// Pre-create the worktree directory (git normally does this)
		mkdirSync(worktreeDir, { recursive: true });

		// Mock: createWorktreeUseCase returns the expected worktree path
		mockedCreateWorktreeUseCase.mockResolvedValue({
			ok: true,
			data: { worktreePath: worktreeDir, branchName: "slice/11111111" },
		});

		// Mock: state stores return a valid slice + milestone
		const mockSlice = {
			id: SLICE_UUID,
			milestoneId: MILESTONE_UUID,
			number: 1,
			title: "Test slice",
			status: "future" as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const mockMilestone = {
			id: MILESTONE_UUID,
			number: 1,
			name: "Test Milestone",
			branch: "main",
			status: "active" as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		mockedCreateClosableStateStoresUnchecked.mockReturnValue({
			sliceStore: {
				getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
				// resolveSliceId calls getSliceByNumbers when given a label like M01-S01
				getSliceByNumbers: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
				listSlices: vi.fn(),
				createSlice: vi.fn(),
				updateSlice: vi.fn(),
			},
			milestoneStore: {
				getMilestone: vi.fn().mockReturnValue({ ok: true, data: mockMilestone }),
				getMilestoneByNumber: vi.fn(),
				listMilestones: vi.fn(),
				createMilestone: vi.fn(),
				updateMilestone: vi.fn(),
			},
			close: vi.fn(),
		} as unknown as ReturnType<typeof createClosableStateStoresUnchecked>);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		vi.clearAllMocks();
		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("writes .tff-project-id into the new worktree directory", async () => {
		const { worktreeCreateCmd } = await import("../../../src/cli/commands/worktree-create.cmd.js");

		const result = JSON.parse(await worktreeCreateCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(true);

		// .tff-project-id must exist in the worktree
		const idFilePath = join(worktreeDir, ".tff-project-id");
		expect(existsSync(idFilePath)).toBe(true);
		const written = readFileSync(idFilePath, "utf-8").trim();
		expect(written).toBe(PROJECT_UUID);
	});

	it("written worktree .tff-project-id matches the primary repo's id", async () => {
		const { worktreeCreateCmd } = await import("../../../src/cli/commands/worktree-create.cmd.js");

		await worktreeCreateCmd(["--slice-id", "M01-S01"]);

		const primaryId = readFileSync(join(tmpDir, ".tff-project-id"), "utf-8").trim();
		const worktreeId = readFileSync(join(worktreeDir, ".tff-project-id"), "utf-8").trim();
		expect(worktreeId).toBe(primaryId);
	});

	it(".tff-cc symlink in worktree points to the same project home as the primary", async () => {
		const { worktreeCreateCmd } = await import("../../../src/cli/commands/worktree-create.cmd.js");

		await worktreeCreateCmd(["--slice-id", "M01-S01"]);

		const { readlinkSync } = await import("node:fs");
		const symlinkPath = join(worktreeDir, ".tff-cc");
		expect(existsSync(symlinkPath)).toBe(true);
		const target = readlinkSync(symlinkPath);
		expect(target).toBe(join(homeDir, PROJECT_UUID));
	});
});
