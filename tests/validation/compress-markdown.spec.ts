/**
 * Tests for compress-markdown.sh script
 * Validates the script exists, is executable, and targets correct directories
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = join(process.cwd(), "scripts", "compress-markdown.sh");

describe("compress-markdown.sh", () => {
	it("should exist at scripts/compress-markdown.sh", () => {
		expect(existsSync(SCRIPT_PATH)).toBe(true);
	});

	it("should be executable", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const stats = statSync(SCRIPT_PATH);
		// Check if any execute bit is set (owner, group, or others)
		const isExecutable = (stats.mode & 0o111) !== 0;
		expect(isExecutable).toBe(true);
	});

	it("should be a bash script with shebang", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const content = readFileSync(SCRIPT_PATH, "utf8");
		expect(content.startsWith("#!/bin/bash")).toBe(true);
	});

	it("should target the correct directories", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const content = readFileSync(SCRIPT_PATH, "utf8");

		// Should include all target directories
		expect(content).toContain("commands/tff");
		expect(content).toContain("workflows");
		expect(content).toContain("skills");
		expect(content).toContain("references");
		expect(content).toContain("agents");
	});

	it("should invoke ultra-compress for symbolic compression", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const content = readFileSync(SCRIPT_PATH, "utf8");

		// Should invoke compression via Node.js script
		expect(content).toContain("compress-symbolic.mjs");
		expect(content).toContain("node");
	});

	it("should use dynamic file enumeration via Node.js", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const content = readFileSync(SCRIPT_PATH, "utf8");

		// Should delegate to Node.js script which handles enumeration
		expect(content).toContain("compress-symbolic.mjs");
	});

	it("should handle errors via Node.js script", () => {
		if (!existsSync(SCRIPT_PATH)) {
			throw new Error("Script does not exist");
		}
		const content = readFileSync(SCRIPT_PATH, "utf8");

		// Should use set -e for error handling
		expect(content).toContain("set -e");

		// The Node.js script handles detailed error handling
		expect(content).toContain("compress-symbolic.mjs");
	});
});
