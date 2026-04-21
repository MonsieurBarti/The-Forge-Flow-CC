// tests/integration/cli-native-binding-failure.integration.spec.ts
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Use a COPY of dist/ per test. Previous versions renamed `.node` files in the
// shared dist/ tree, which races with other integration tests running in
// parallel — they inherited the stashed state and failed with
// `__filename is not defined` from better-sqlite3's default resolver in the ESM
// bundle. Copying keeps the real dist/ untouched for other tests.
const DIST_SRC = join(process.cwd(), "dist");
const PREBUILT = `better_sqlite3.${process.platform}-${process.arch}.node`;
const PREBUILT_PATHS_IN_DIST = [
	join(DIST_SRC, "cli", PREBUILT),
	join(DIST_SRC, "infrastructure", "adapters", "sqlite", PREBUILT),
];
const prebuiltExists = PREBUILT_PATHS_IN_DIST.every((p) => existsSync(p));

let repo: string;
let distCopy: string;

const copyDistWithoutPrebuilts = (dstBase: string): string => {
	const dst = join(dstBase, "dist");
	cpSync(DIST_SRC, dst, { recursive: true, dereference: false });
	// Remove every copy of the platform-tagged prebuilt from the copy.
	for (const relative of ["cli", "infrastructure/adapters/sqlite"]) {
		const target = join(dst, relative, PREBUILT);
		if (existsSync(target)) rmSync(target);
	}
	return join(dst, "cli", "index.js");
};

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-nbf-"));
	distCopy = mkdtempSync(join(tmpdir(), "tff-nbf-dist-"));
});
afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
	rmSync(distCopy, { recursive: true, force: true });
});

describe("CLI emits structured JSON when native binding fails", () => {
	it.skipIf(!prebuiltExists)(
		"exits 1 with code NATIVE_BINDING_FAILED when no binding loads",
		() => {
			const cliCopy = copyDistWithoutPrebuilts(distCopy);

			const out = spawnSync("node", [cliCopy, "slice:list"], {
				cwd: repo,
				env: { ...process.env, NODE_PATH: "" },
				encoding: "utf-8",
				timeout: 30_000,
			});
			expect(out.status).toBe(1);
			const payload = JSON.parse(out.stdout);
			expect(payload.ok).toBe(false);
			expect(payload.error.code).toBe("NATIVE_BINDING_FAILED");
			expect(payload.error.details.platform).toBe(process.platform);
			expect(payload.error.details.arch).toBe(process.arch);
			expect(payload.error.details.nodeAbi).toBe(process.versions.modules);
			expect(Array.isArray(payload.error.details.candidates)).toBe(true);
			expect(payload.error.details.remediation).toContain("bun install --force better-sqlite3");
		},
	);

	it.skipIf(!prebuiltExists)(
		"uses local node_modules fallback when prebuilt candidates are missing",
		() => {
			const cliCopy = copyDistWithoutPrebuilts(distCopy);

			// The local-fallback candidate resolves from `process.cwd()/node_modules/
			// better-sqlite3/build/Release/better_sqlite3.node`. Symlink the real
			// package into the tmp repo so the candidate iterator finds it.
			const src = join(process.cwd(), "node_modules", "better-sqlite3");
			const dstDir = join(repo, "node_modules");
			mkdirSync(dstDir, { recursive: true });
			symlinkSync(src, join(dstDir, "better-sqlite3"), "dir");

			const out = spawnSync("node", [cliCopy, "slice:list"], {
				cwd: repo,
				encoding: "utf-8",
				timeout: 30_000,
			});
			// Key assertion: exit 0 — the CLI opened the DB via the local fallback.
			expect(out.status).toBe(0);
			expect(JSON.parse(out.stdout).ok).toBe(true);
		},
	);
});
