// tests/unit/infrastructure/adapters/sqlite/open-database.spec.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NativeBindingError } from "../../../../../src/infrastructure/adapters/sqlite/native-binding-error.js";
import {
	openDatabase,
	openDatabaseWithTrace,
} from "../../../../../src/infrastructure/adapters/sqlite/open-database.js";

let workdir: string;

beforeEach(() => {
	workdir = mkdtempSync(join(tmpdir(), "tff-open-"));
});
afterEach(() => {
	rmSync(workdir, { recursive: true, force: true });
});

describe("openDatabase", () => {
	it("opens :memory: using the default resolver when no dirname is passed", () => {
		const db = openDatabase(":memory:");
		try {
			expect(db.prepare("SELECT 1 AS x").get()).toEqual({ x: 1 });
		} finally {
			db.close();
		}
	});

	it("throws NativeBindingError when no candidate loads", () => {
		const distDir = join(workdir, "empty-dist");
		mkdirSync(distDir, { recursive: true });
		const prebuilt = join(distDir, `better_sqlite3.${process.platform}-${process.arch}.node`);
		writeFileSync(prebuilt, "not a real shared object");
		const originalCwd = process.cwd();
		process.chdir(workdir);
		try {
			expect(() => openDatabase(":memory:", undefined, distDir)).toThrow(NativeBindingError);
		} finally {
			process.chdir(originalCwd);
		}
	});
});

describe("openDatabaseWithTrace", () => {
	it("returns the winning candidate when load succeeds", () => {
		const traced = openDatabaseWithTrace(":memory:");
		try {
			expect(traced.db.prepare("SELECT 1 AS x").get()).toEqual({ x: 1 });
			expect(["prebuilt", "local"]).toContain(traced.winningCandidate.source);
			expect(traced.winningCandidate.path).toBeTypeOf("string");
		} finally {
			traced.db.close();
		}
	});

	it("uses the better-sqlite3 default resolver when no candidates exist and labels the trace as <better-sqlite3 default>", () => {
		// Empty dirname + cwd with no node_modules/better-sqlite3 => candidates: [].
		const emptyDir = join(workdir, "no-candidates");
		mkdirSync(emptyDir, { recursive: true });
		const originalCwd = process.cwd();
		process.chdir(workdir);
		try {
			const traced = openDatabaseWithTrace(":memory:", undefined, emptyDir);
			try {
				expect(traced.winningCandidate.path).toBe("<better-sqlite3 default>");
				expect(traced.winningCandidate.source).toBe("prebuilt");
				expect(traced.db.prepare("SELECT 1 AS x").get()).toEqual({ x: 1 });
			} finally {
				traced.db.close();
			}
		} finally {
			process.chdir(originalCwd);
		}
	});

	// Default-resolver FAILURE path: would require monkey-patching better-sqlite3 at
	// module-load time; not worth the test infra for a branch that's already reached
	// via the `candidates.length > 0` exhaustion path in the test above. Left
	// documented here so future dev knows the gap exists.
	it.skip("wraps a default-resolver failure in NativeBindingError (covered by type review only)", () => {});
});
