import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const voDir = path.resolve(repoRoot, "src/domain/value-objects");
const files = readdirSync(voDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"));

interface ZodLike {
	safeParse: (input: unknown) => { success: boolean };
}

const isZodLike = (v: unknown): v is ZodLike =>
	typeof v === "object" &&
	v !== null &&
	"safeParse" in v &&
	typeof (v as { safeParse?: unknown }).safeParse === "function";

describe("every value-object has a parser that rejects invalid input", () => {
	for (const file of files) {
		it(`${file}`, async () => {
			const mod = (await import(path.join(voDir, file))) as Record<string, unknown>;
			const schemas = Object.values(mod).filter(isZodLike);
			const parseFns = Object.values(mod).filter(
				(v): v is (input: unknown) => { success?: boolean; ok?: boolean } =>
					typeof v === "function",
			);

			// There must be at least one schema OR parse/create fn.
			expect(schemas.length + parseFns.length, `${file} lacks schema and parse fn`).toBeGreaterThan(
				0,
			);

			// Every schema must be a real validator: it should reject at least one of these.
			for (const schema of schemas) {
				const testInputs = [123, "invalid", [], null];
				const rejections = testInputs.filter((input) => !schema.safeParse(input).success);
				expect(
					rejections.length,
					`${file}: schema accepts all test inputs — not a real validator`,
				).toBeGreaterThan(0);
			}
		});
	}
});
