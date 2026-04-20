import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("build manifest", () => {
	it("writes dist/.build-manifest.json with sourceSha, bundleSha256, builtAt", () => {
		// Ensure a clean build so timestamps and hashes are fresh.
		execSync("bun run build", { stdio: "inherit" });

		const manifestPath = "dist/.build-manifest.json";
		expect(existsSync(manifestPath)).toBe(true);

		const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
			sourceSha: string;
			bundleSha256: string;
			builtAt: string;
		};

		// sourceSha: matches `git rev-parse HEAD`
		const expectedSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
		expect(manifest.sourceSha).toBe(expectedSha);

		// bundleSha256: matches sha256 of dist/cli/index.js
		const bundle = readFileSync("dist/cli/index.js");
		const expectedBundleSha = createHash("sha256").update(bundle).digest("hex");
		expect(manifest.bundleSha256).toBe(expectedBundleSha);

		// builtAt: ISO-8601 timestamp parseable as a Date
		expect(() => new Date(manifest.builtAt).toISOString()).not.toThrow();
		expect(manifest.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
