import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const verifyScript = resolve(repoRoot, "scripts/verify-build-manifest.sh");

function setup(bundleBytes: string, manifestSha: string): string {
	const root = mkdtempSync(join(tmpdir(), "verify-manifest-"));
	mkdirSync(join(root, "dist", "cli"), { recursive: true });
	writeFileSync(join(root, "dist", "cli", "index.js"), bundleBytes);
	writeFileSync(
		join(root, "dist", ".build-manifest.json"),
		JSON.stringify({
			sourceSha: "deadbeef",
			bundleSha256: manifestSha,
			builtAt: "2026-04-20T00:00:00.000Z",
		}),
	);
	return root;
}

describe("verify-build-manifest.sh", () => {
	it("exits 0 when bundle sha256 matches manifest", () => {
		const bundle = "console.log('hello');\n";
		const realSha = createHash("sha256").update(bundle).digest("hex");
		const root = setup(bundle, realSha);

		expect(() =>
			execSync(`bash ${verifyScript}`, { cwd: root, stdio: "pipe" }),
		).not.toThrow();
	});

	it("exits non-zero when bundle sha256 does not match manifest", () => {
		const root = setup(
			"real content\n",
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		expect(() =>
			execSync(`bash ${verifyScript}`, { cwd: root, stdio: "pipe" }),
		).toThrow();
	});

	it("exits non-zero when manifest is missing", () => {
		const root = mkdtempSync(join(tmpdir(), "verify-manifest-missing-"));
		mkdirSync(join(root, "dist", "cli"), { recursive: true });
		writeFileSync(join(root, "dist", "cli", "index.js"), "x");
		expect(() =>
			execSync(`bash ${verifyScript}`, { cwd: root, stdio: "pipe" }),
		).toThrow();
	});
});
