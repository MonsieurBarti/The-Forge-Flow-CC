import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("build manifest", () => {
	it("writes dist/.build-manifest.json with sourceSha, bundleSha256, builtAt", () => {
		// Ensure a clean build so timestamps and hashes are fresh.
		execSync("bun run build", { stdio: "inherit", cwd: repoRoot });

		const manifestPath = resolve(repoRoot, "dist/.build-manifest.json");
		expect(existsSync(manifestPath)).toBe(true);

		const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
			sourceSha: string;
			bundleSha256: string;
			builtAt: string;
		};

		// sourceSha: matches `git rev-parse HEAD`
		const expectedSha = execSync("git rev-parse HEAD", {
			encoding: "utf8",
			cwd: repoRoot,
		}).trim();
		expect(manifest.sourceSha).toBe(expectedSha);

		// bundleSha256: matches sha256 of dist/cli/index.js
		const bundle = readFileSync(resolve(repoRoot, "dist/cli/index.js"));
		const expectedBundleSha = createHash("sha256").update(bundle).digest("hex");
		expect(manifest.bundleSha256).toBe(expectedBundleSha);

		// builtAt: ISO-8601 timestamp parseable as a Date
		expect(() => new Date(manifest.builtAt).toISOString()).not.toThrow();
		expect(manifest.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
