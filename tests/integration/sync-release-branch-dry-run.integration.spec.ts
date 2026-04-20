import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sync-release-branch.sh DRY_RUN mode", () => {
	it("exits 0 without pushing when TFF_RELEASE_SYNC_DRY_RUN=yes", () => {
		// The caller must have already built dist/ and have plugin/.claude-plugin/plugin.json present.
		expect(existsSync("dist/cli/index.js")).toBe(true);
		expect(existsSync("plugin/.claude-plugin/plugin.json")).toBe(true);

		const output = execSync("bash scripts/sync-release-branch.sh", {
			env: {
				...process.env,
				TFF_RELEASE_SYNC_CONFIRM: "yes",
				TFF_RELEASE_SYNC_DRY_RUN: "yes",
			},
			encoding: "utf8",
		});

		expect(output).toContain("DRY RUN: skipping force-push");
		expect(output).toContain("release tree assembled at");

		const match = output.match(/release tree assembled at (\S+)/);
		expect(match).not.toBeNull();
		expect(existsSync(match![1])).toBe(true);
		rmSync(match![1], { recursive: true, force: true });
	});

	it("copies .github/workflows/ into the release tree", () => {
		const output = execSync("bash scripts/sync-release-branch.sh", {
			env: {
				...process.env,
				TFF_RELEASE_SYNC_CONFIRM: "yes",
				TFF_RELEASE_SYNC_DRY_RUN: "yes",
			},
			encoding: "utf8",
		});

		const match = output.match(/release tree assembled at (\S+)/);
		expect(match).not.toBeNull();
		const treeDir = match![1];

		try {
			expect(existsSync(`${treeDir}/.github/workflows/release-branch-validation.yml`)).toBe(true);
		} finally {
			rmSync(treeDir, { recursive: true, force: true });
		}
	});
});
