import { describe, expect, it, vi } from "vitest";
import type { GitOps } from "../../../../src/domain/ports/git-ops.port.js";
import { Ok } from "../../../../src/domain/result.js";

const makeGitOps = (currentBranch: string, defaultBranch: string): GitOps =>
	({
		getCurrentBranch: vi.fn().mockResolvedValue(Ok(currentBranch)),
		detectDefaultBranch: vi.fn().mockResolvedValue(Ok(defaultBranch)),
	}) as unknown as GitOps;

describe("withBranchGuard", () => {
	it("delegates to handler on a feature branch", async () => {
		const { withBranchGuard } = await import("../../../../src/cli/utils/with-branch-guard.js");
		const git = makeGitOps("feature/my-branch", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "result" }));

		const wrapped = withBranchGuard("test:cmd", handler, () => git);
		const output = await wrapped(["--flag"]);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(["--flag"]);
		expect(output).toBe(JSON.stringify({ ok: true, data: "result" }));
	});

	it("returns ok:false with REFUSED_ON_DEFAULT_BRANCH when on main, handler not called", async () => {
		const { withBranchGuard } = await import("../../../../src/cli/utils/with-branch-guard.js");
		const git = makeGitOps("main", "main");
		const handler = vi.fn();

		const wrapped = withBranchGuard("test:cmd", handler, () => git);
		const output = await wrapped([]);

		const parsed = JSON.parse(output);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
		expect(handler).not.toHaveBeenCalled();
	});
});
