import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const voDir = path.resolve(repoRoot, "src/domain/value-objects");
const files = readdirSync(voDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"));

describe("every value-object exports a Zod schema or parse fn", () => {
	for (const file of files) {
		it(`${file}`, async () => {
			const mod = (await import(path.join(voDir, file))) as Record<string, unknown>;
			const hasSchema = Object.values(mod).some(
				(v) => typeof v === "object" && v !== null && "safeParse" in (v as Record<string, unknown>),
			);
			const hasParse = typeof mod.parse === "function" || typeof mod.create === "function";
			expect(hasSchema || hasParse, `${file} lacks schema and parse fn`).toBe(true);
		});
	}
});
