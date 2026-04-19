import { describe, expect, it, vi } from "vitest";
import { assertNotOnDefaultBranch } from "../../../../src/application/guards/branch-guard.js";
import type { GitOps } from "../../../../src/domain/ports/git-ops.port.js";
import { Err, Ok } from "../../../../src/domain/result.js";

const makeGitOps = (overrides: Partial<GitOps> = {}): GitOps =>
	({
		getCurrentBranch: vi.fn().mockResolvedValue(Ok("feature/my-work")),
		detectDefaultBranch: vi.fn().mockResolvedValue(Ok("main")),
		...overrides,
	}) as unknown as GitOps;

describe("assertNotOnDefaultBranch", () => {
	it("returns Ok when on a feature branch", async () => {
		const git = makeGitOps();
		const result = await assertNotOnDefaultBranch(git, "tff:execute");
		expect(result.ok).toBe(true);
	});

	it("returns REFUSED_ON_DEFAULT_BRANCH when on main", async () => {
		const git = makeGitOps({
			getCurrentBranch: vi.fn().mockResolvedValue(Ok("main")),
			detectDefaultBranch: vi.fn().mockResolvedValue(Ok("main")),
		});
		const result = await assertNotOnDefaultBranch(git, "tff:execute");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
			expect(result.error.context).toMatchObject({ command: "tff:execute", branch: "main" });
		}
	});

	it("returns REFUSED_ON_DEFAULT_BRANCH when on master and master is default", async () => {
		const git = makeGitOps({
			getCurrentBranch: vi.fn().mockResolvedValue(Ok("master")),
			detectDefaultBranch: vi.fn().mockResolvedValue(Ok("master")),
		});
		const result = await assertNotOnDefaultBranch(git, "tff:ship");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
			expect(result.error.context).toMatchObject({ command: "tff:ship", branch: "master" });
		}
	});

	it("propagates git error from getCurrentBranch as-is", async () => {
		const originalError = { code: "GIT_ERROR" as const, message: "git failed", details: {} };
		const git = makeGitOps({
			getCurrentBranch: vi.fn().mockResolvedValue(Err(originalError)),
		});
		const result = await assertNotOnDefaultBranch(git, "tff:execute");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe(originalError);
		}
	});

	it("propagates git error from detectDefaultBranch as-is", async () => {
		const originalError = { code: "GIT_ERROR" as const, message: "ref failed", details: {} };
		const git = makeGitOps({
			getCurrentBranch: vi.fn().mockResolvedValue(Ok("feature/foo")),
			detectDefaultBranch: vi.fn().mockResolvedValue(Err(originalError)),
		});
		const result = await assertNotOnDefaultBranch(git, "tff:execute");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe(originalError);
		}
	});
});
