// tests/unit/infrastructure/adapters/sqlite/load-native-binding.spec.ts
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNativeBindingCandidates } from "../../../../../src/infrastructure/adapters/sqlite/load-native-binding.js";

let workdir: string;
let distDir: string;
let nodeModulesBuild: string;

beforeEach(() => {
	workdir = mkdtempSync(join(tmpdir(), "tff-binding-"));
	distDir = join(workdir, "dist");
	nodeModulesBuild = join(workdir, "node_modules", "better-sqlite3", "build", "Release");
	mkdirSync(distDir, { recursive: true });
	mkdirSync(nodeModulesBuild, { recursive: true });
	vi.spyOn(process, "cwd").mockReturnValue(workdir);
});
afterEach(() => {
	rmSync(workdir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

describe("getNativeBindingCandidates", () => {
	const prebuiltName = `better_sqlite3.${process.platform}-${process.arch}.node`;

	it("returns prebuilt first, then local, when both exist", () => {
		writeFileSync(join(distDir, prebuiltName), "fake");
		writeFileSync(join(nodeModulesBuild, "better_sqlite3.node"), "fake");
		const cands = getNativeBindingCandidates(distDir);
		expect(cands.map((c) => c.source)).toEqual(["prebuilt", "local"]);
		expect(cands[0].path).toContain(prebuiltName);
		expect(cands[1].path).toContain(join("build", "Release"));
	});

	it("returns only prebuilt when local is absent", () => {
		writeFileSync(join(distDir, prebuiltName), "fake");
		const cands = getNativeBindingCandidates(distDir);
		expect(cands.map((c) => c.source)).toEqual(["prebuilt"]);
	});

	it("returns only local when prebuilt is absent", () => {
		writeFileSync(join(nodeModulesBuild, "better_sqlite3.node"), "fake");
		const cands = getNativeBindingCandidates(distDir);
		expect(cands.map((c) => c.source)).toEqual(["local"]);
	});

	it("returns [] when neither exists", () => {
		expect(getNativeBindingCandidates(distDir)).toEqual([]);
	});

	it("filters by existsSync (no phantom entries)", () => {
		const cands = getNativeBindingCandidates(distDir);
		for (const c of cands) {
			expect(existsSync(c.path)).toBe(true);
		}
	});
});
