import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { FilesystemSignalExtractor } from "../../../../../src/infrastructure/adapters/filesystem/filesystem-signal-extractor.js";

const FIXTURE_ROOT = join(process.cwd(), "tests/fixtures/routing");

describe("FilesystemSignalExtractor", () => {
	const extractor = new FilesystemSignalExtractor();

	it("classifies a trivial slice as low/low with no risk tags", async () => {
		const res = await extractor.extract({
			slice_id: "fx-trivial",
			spec_path: join(FIXTURE_ROOT, "slice-trivial/SPEC.md"),
			affected_files: ["src/foo.ts"],
			description: "rename local variable",
		});
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.complexity).toBe("low");
		expect(res.data.risk.level).toBe("low");
		expect(res.data.risk.tags).toEqual([]);
	});

	it("classifies a migration+auth slice as high risk with matching tags", async () => {
		const res = await extractor.extract({
			slice_id: "fx-risky",
			spec_path: join(FIXTURE_ROOT, "slice-risky-migration/SPEC.md"),
			affected_files: Array.from({ length: 25 }, (_, i) => `src/f${i}.ts`),
			description: "Performs a breaking schema migration on user auth tables.",
		});
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.risk.level).toBe("high");
		expect(res.data.risk.tags).toEqual(expect.arrayContaining(["auth", "migrations", "breaking"]));
		expect(res.data.complexity).toBe("high");
	});

	it("returns minimal signals when spec file is missing", async () => {
		const res = await extractor.extract({
			slice_id: "fx-missing",
			spec_path: join(FIXTURE_ROOT, "does-not-exist/SPEC.md"),
			affected_files: ["src/foo.ts"],
			description: "small change",
		});
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.complexity).toBe("low");
		expect(res.data.risk.level).toBe("low");
	});
});
