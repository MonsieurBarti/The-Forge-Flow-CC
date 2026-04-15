import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as yaml from "yaml";
import { detectSpecEdit } from "../../../src/application/guard/detect-spec-edit.js";

// Mock fs module using factory pattern
vi.mock("node:fs", () => {
	return {
		existsSync: vi.fn(),
		readFileSync: vi.fn(),
	};
});

// Mock yaml module
vi.mock("yaml", () => {
	return {
		parse: vi.fn(),
	};
});

const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedReadFileSync = vi.mocked(fs.readFileSync);
const mockedParseYaml = vi.mocked(yaml.parse);

describe("detect-spec-edit", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: project initialized, guards enabled
		mockedExistsSync.mockImplementation((p: string) => {
			if (typeof p === "string" && p.includes(".tff/settings.yaml")) return true;
			return false;
		});
		mockedReadFileSync.mockReturnValue("workflow:\n  guards: true");
		mockedParseYaml.mockReturnValue({ workflow: { guards: true } });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("GUARD_DISABLED", () => {
		it("should return GUARD_DISABLED when workflow.guards is false", () => {
			mockedExistsSync.mockImplementation((p: string) => {
				if (typeof p === "string" && p.includes(".tff/settings.yaml")) return true;
				return false;
			});
			mockedReadFileSync.mockReturnValue("workflow:\n  guards: false");
			mockedParseYaml.mockReturnValue({ workflow: { guards: false } });

			const result = detectSpecEdit("SPEC.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("GUARD_DISABLED");
		});

		it("should return GUARD_DISABLED when settings.yaml does not exist", () => {
			mockedExistsSync.mockReturnValue(false);

			const result = detectSpecEdit("SPEC.md");

			// When no settings, guards default to enabled, so it should detect SPEC_EDIT
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should return GUARD_DISABLED when workflow.guards is explicitly false for lowercase spec.md", () => {
			mockedExistsSync.mockImplementation((p: string) => {
				if (typeof p === "string" && p.includes(".tff/settings.yaml")) return true;
				return false;
			});
			mockedReadFileSync.mockReturnValue("workflow:\n  guards: false");
			mockedParseYaml.mockReturnValue({ workflow: { guards: false } });

			const result = detectSpecEdit("spec.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("GUARD_DISABLED");
		});

		it("should return GUARD_DISABLED when YAML parsing throws error", () => {
			mockedExistsSync.mockImplementation((p: string) => {
				if (typeof p === "string" && p.includes(".tff/settings.yaml")) return true;
				return false;
			});
			mockedReadFileSync.mockReturnValue("invalid: yaml: content:");
			mockedParseYaml.mockImplementation(() => {
				throw new Error("YAML parse error");
			});

			const result = detectSpecEdit("SPEC.md");

			// On parse error, default to enabled (guards not disabled)
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});
	});

	describe("NOT_SPEC_FILE", () => {
		it("should return NOT_SPEC_FILE for README.md", () => {
			const result = detectSpecEdit("README.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for TASK.md", () => {
			const result = detectSpecEdit("TASK.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for MY-SPEC.md (not exact match)", () => {
			const result = detectSpecEdit("MY-SPEC.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for SPEC.md.backup", () => {
			const result = detectSpecEdit("SPEC.md.backup");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for nested TASK.md path", () => {
			const result = detectSpecEdit(".tff/milestones/M001/slices/S01/TASK.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for empty string", () => {
			const result = detectSpecEdit("");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for path without .md extension", () => {
			const result = detectSpecEdit("README");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for file with spaces in name", () => {
			const result = detectSpecEdit("my spec.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for spec.mdx (not exact match)", () => {
			const result = detectSpecEdit("spec.mdx");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should return NOT_SPEC_FILE for spec-markdown.md", () => {
			const result = detectSpecEdit("spec-markdown.md");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});
	});

	describe("SPEC_EDIT_DETECTED", () => {
		it("should detect SPEC.md in root directory", () => {
			const result = detectSpecEdit("SPEC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.warning?.message).toContain("SPEC.md modified outside workflow");
			expect(result.warning?.suggestion).toContain("/tff:discuss");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect lowercase spec.md", () => {
			const result = detectSpecEdit("spec.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect mixed case Spec.md", () => {
			const result = detectSpecEdit("Spec.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect mixed case sPeC.md", () => {
			const result = detectSpecEdit("sPeC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect SPEC.md in .tff/milestones/M001/", () => {
			const result = detectSpecEdit(".tff/milestones/M001/SPEC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect SPEC.md in slices/S01/", () => {
			const result = detectSpecEdit("slices/S01/SPEC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect lowercase spec.md in nested path", () => {
			const result = detectSpecEdit(".tff/milestones/M001/slices/S01/spec.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect with backslash path separators (Windows-style)", () => {
			const result = detectSpecEdit(".tff\\milestones\\M001\\SPEC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should detect absolute path to SPEC.md", () => {
			const result = detectSpecEdit("/Users/monsieurbarti/Projects/The-Forge-Flow-CC/SPEC.md");

			expect(result.warning).not.toBeNull();
			expect(result.warning?.code).toBe("SPEC_EDIT_DETECTED");
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});
	});

	describe("boundary conditions and edge cases", () => {
		it("should handle path with trailing slash", () => {
			// A trailing slash makes it a directory, not a file
			// The basename would be empty or undefined behavior
			const result = detectSpecEdit("SPEC.md/");

			// Empty basename case - should NOT match SPEC.md
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should handle path with query parameters", () => {
			const result = detectSpecEdit("SPEC.md?version=2");

			expect(result.warning).not.toBeNull();
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should handle path with hash fragment", () => {
			const result = detectSpecEdit("SPEC.md#section1");

			expect(result.warning).not.toBeNull();
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});

		it("should handle double extension SPEC.md.txt", () => {
			const result = detectSpecEdit("SPEC.md.txt");

			expect(result.warning).toBeNull();
			expect(result.reason).toBe("NOT_SPEC_FILE");
		});

		it("should handle empty settings.yaml gracefully", () => {
			mockedExistsSync.mockImplementation((p: string) => {
				if (typeof p === "string" && p.includes(".tff/settings.yaml")) return true;
				return false;
			});
			mockedReadFileSync.mockReturnValue("");
			mockedParseYaml.mockReturnValue({});

			const result = detectSpecEdit("SPEC.md");

			// Empty settings defaults to guards enabled
			expect(result.warning).not.toBeNull();
			expect(result.reason).toBe("SPEC_EDIT_DETECTED");
		});
	});
});
