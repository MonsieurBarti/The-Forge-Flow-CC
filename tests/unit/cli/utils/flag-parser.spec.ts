import { describe, expect, it } from "vitest";
import { type CommandSchema, parseFlags } from "../../../../src/cli/utils/flag-parser.js";

describe("parseFlags", () => {
	const simpleSchema: CommandSchema = {
		name: "test:command",
		purpose: "Test command for parser",
		requiredFlags: [{ name: "slice-id", type: "string", description: "Slice ID" }],
		optionalFlags: [{ name: "verbose", type: "boolean", description: "Verbose output" }],
		examples: ["test:command --slice-id M01-S01"],
	};

	describe("basic parsing", () => {
		it("parses --flag value syntax", () => {
			const result = parseFlags(["--slice-id", "M01-S01"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01" },
			});
		});

		it("parses --flag=value syntax", () => {
			const result = parseFlags(["--slice-id=M01-S01"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01" },
			});
		});

		it("parses boolean flags without value", () => {
			const result = parseFlags(["--slice-id", "M01-S01", "--verbose"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01", verbose: true },
			});
		});

		it("returns error for missing required flag", () => {
			const result = parseFlags([], simpleSchema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
				expect(result.error.missingFlags).toContain("slice-id");
			}
		});

		it("returns error for unknown flag", () => {
			const result = parseFlags(["--slice-id", "M01-S01", "--unknown-flag"], simpleSchema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("UNKNOWN_FLAG");
				expect(result.error.unknownFlag).toBe("unknown-flag");
				expect(result.error.validFlags).toContain("slice-id");
				expect(result.error.validFlags).toContain("verbose");
			}
		});
	});

	describe("type coercion", () => {
		it("parses number type flags", () => {
			const schema: CommandSchema = {
				name: "test:number",
				purpose: "Test number parsing",
				requiredFlags: [{ name: "count", type: "number", description: "Count" }],
				optionalFlags: [],
				examples: [],
			};
			const result = parseFlags(["--count", "42"], schema);
			expect(result).toEqual({
				ok: true,
				data: { count: 42 },
			});
		});

		it("parses json type flags", () => {
			const schema: CommandSchema = {
				name: "test:json",
				purpose: "Test JSON parsing",
				requiredFlags: [{ name: "data", type: "json", description: "JSON data" }],
				optionalFlags: [],
				examples: [],
			};
			const result = parseFlags(["--data", '{"key":"value"}'], schema);
			expect(result).toEqual({
				ok: true,
				data: { data: { key: "value" } },
			});
		});

		it("returns error for invalid JSON", () => {
			const schema: CommandSchema = {
				name: "test:json",
				purpose: "Test JSON parsing",
				requiredFlags: [{ name: "data", type: "json", description: "JSON data" }],
				optionalFlags: [],
				examples: [],
			};
			const result = parseFlags(["--data", "not-valid-json{"], schema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("INVALID_JSON");
			}
		});

		it("returns error for invalid number", () => {
			const schema: CommandSchema = {
				name: "test:number",
				purpose: "Test number parsing",
				requiredFlags: [{ name: "count", type: "number", description: "Count" }],
				optionalFlags: [],
				examples: [],
			};
			const result = parseFlags(["--count", "not-a-number"], schema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("INVALID_NUMBER");
			}
		});
	});

	describe("enum validation", () => {
		it("validates enum values", () => {
			const schema: CommandSchema = {
				name: "test:enum",
				purpose: "Test enum validation",
				requiredFlags: [
					{
						name: "status",
						type: "string",
						description: "Status",
						enum: ["planning", "executing", "done"],
					},
				],
				optionalFlags: [],
				examples: [],
			};

			const result = parseFlags(["--status", "planning"], schema);
			expect(result).toEqual({
				ok: true,
				data: { status: "planning" },
			});
		});

		it("returns error for invalid enum value", () => {
			const schema: CommandSchema = {
				name: "test:enum",
				purpose: "Test enum validation",
				requiredFlags: [
					{
						name: "status",
						type: "string",
						description: "Status",
						enum: ["planning", "executing", "done"],
					},
				],
				optionalFlags: [],
				examples: [],
			};

			const result = parseFlags(["--status", "invalid"], schema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("INVALID_ENUM_VALUE");
				expect(result.error.validValues).toEqual(["planning", "executing", "done"]);
			}
		});
	});

	describe("pattern validation", () => {
		it("validates pattern matches", () => {
			const schema: CommandSchema = {
				name: "test:pattern",
				purpose: "Test pattern validation",
				requiredFlags: [
					{
						name: "slice-id",
						type: "string",
						description: "Slice ID",
						pattern: "^M\\d+-S\\d+$",
					},
				],
				optionalFlags: [],
				examples: [],
			};

			const result = parseFlags(["--slice-id", "M01-S01"], schema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01" },
			});
		});

		it("returns error for pattern mismatch", () => {
			const schema: CommandSchema = {
				name: "test:pattern",
				purpose: "Test pattern validation",
				requiredFlags: [
					{
						name: "slice-id",
						type: "string",
						description: "Slice ID",
						pattern: "^M\\d+-S\\d+$",
					},
				],
				optionalFlags: [],
				examples: [],
			};

			const result = parseFlags(["--slice-id", "invalid"], schema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("PATTERN_MISMATCH");
			}
		});
	});

	describe("help detection", () => {
		it("detects --help flag", () => {
			const result = parseFlags(["--help"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { _help: true },
			});
		});

		it("detects --help with other flags", () => {
			const result = parseFlags(["--slice-id", "M01-S01", "--help"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01", _help: true },
			});
		});
	});

	describe("json flag detection", () => {
		it("detects --json flag", () => {
			const result = parseFlags(["--slice-id", "M01-S01", "--json"], simpleSchema);
			expect(result).toEqual({
				ok: true,
				data: { "slice-id": "M01-S01", _json: true },
			});
		});
	});

	describe("multiple missing required flags", () => {
		it("reports all missing required flags", () => {
			const schema: CommandSchema = {
				name: "test:multi",
				purpose: "Test multiple required flags",
				requiredFlags: [
					{ name: "slice-id", type: "string", description: "Slice ID" },
					{ name: "status", type: "string", description: "Status" },
				],
				optionalFlags: [],
				examples: [],
			};

			const result = parseFlags([], schema);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
				expect(result.error.missingFlags).toContain("slice-id");
				expect(result.error.missingFlags).toContain("status");
			}
		});
	});
});
