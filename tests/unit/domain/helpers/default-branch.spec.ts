import { describe, expect, it, vi } from "vitest";
import { detectDefaultBranch, type RunGit } from "../../../../src/domain/helpers/default-branch.js";

const opts = { cwd: "/tmp/repo" };

describe("detectDefaultBranch", () => {
	it("returns symbolic-ref result stripped of origin/ prefix", async () => {
		const runGit: RunGit = vi.fn(async () => "origin/main\n");
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("main");
		expect(runGit).toHaveBeenCalledWith(
			"git",
			["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
			opts,
		);
	});

	it("returns master when symbolic-ref returns origin/master", async () => {
		const runGit: RunGit = vi.fn(async () => "origin/master\n");
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("master");
	});

	it("trims whitespace from symbolic-ref output", async () => {
		const runGit: RunGit = vi.fn(async () => "  origin/develop  \n");
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("develop");
	});

	it("falls back to git config init.defaultBranch when symbolic-ref throws", async () => {
		const runGit: RunGit = vi.fn(async (_cmd, args) => {
			if (args[0] === "symbolic-ref") {
				throw new Error("no upstream");
			}
			return "trunk\n";
		});
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("trunk");
		expect(runGit).toHaveBeenCalledWith("git", ["config", "--get", "init.defaultBranch"], opts);
	});

	it("falls back to 'main' when both symbolic-ref and config throw", async () => {
		const runGit: RunGit = vi.fn(async () => {
			throw new Error("git failure");
		});
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("main");
	});

	it("falls back to 'main' when symbolic-ref returns empty/whitespace output", async () => {
		const runGit: RunGit = vi.fn(async (_cmd, args) => {
			if (args[0] === "symbolic-ref") return "   \n";
			throw new Error("no init.defaultBranch");
		});
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("main");
	});

	it("falls back to config when symbolic-ref returns empty", async () => {
		const runGit: RunGit = vi.fn(async (_cmd, args) => {
			if (args[0] === "symbolic-ref") return "";
			return "develop\n";
		});
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("develop");
	});

	it("falls back to 'main' when config returns empty", async () => {
		const runGit: RunGit = vi.fn(async (_cmd, args) => {
			if (args[0] === "symbolic-ref") throw new Error("nope");
			return "\n";
		});
		await expect(detectDefaultBranch(runGit, opts)).resolves.toBe("main");
	});
});
