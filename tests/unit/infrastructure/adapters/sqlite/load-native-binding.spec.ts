import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getNativeBindingPath } from "../../../../../src/infrastructure/adapters/sqlite/load-native-binding.js";

describe("getNativeBindingPath", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-native-binding-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns path when co-located binding exists", () => {
		const bindingFile = `better_sqlite3.${process.platform}-${process.arch}.node`;
		writeFileSync(path.join(tmpDir, bindingFile), "fake-binary");

		const result = getNativeBindingPath(tmpDir);
		expect(result).toBe(path.join(tmpDir, bindingFile));
	});

	it("returns undefined when no co-located binding exists", () => {
		const result = getNativeBindingPath(tmpDir);
		expect(result).toBeUndefined();
	});

	it("returns undefined for default dirname in dev/test environment", () => {
		const result = getNativeBindingPath();
		expect(result).toBeUndefined();
	});
});
