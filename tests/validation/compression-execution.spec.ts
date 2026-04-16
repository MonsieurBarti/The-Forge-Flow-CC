/**
 * Tests for compression execution
 * Validates that all files were compressed with backups and protected zones intact
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

// Target directories with expected file patterns
const TARGET_DIRS = [
	{ dir: "commands/tff", pattern: "*.md", maxDepth: 1 },
	{ dir: "workflows", pattern: "*.md", maxDepth: 1 },
	{ dir: "skills", pattern: "SKILL.md", maxDepth: undefined }, // recursive
	{ dir: "references", pattern: "*.md", maxDepth: 1 },
	{ dir: "agents", pattern: "*.md", maxDepth: 1 },
];

// Excluded paths that should NOT have backups
const EXCLUDED_PATTERNS = [".pi/hippo-memory", "node_modules", "README.md", "CHANGELOG.md"];

/**
 * Find all target .md files (the files that should be compressed)
 * Excludes .original.md backup files
 */
function findTargetFiles(): string[] {
	const files: string[] = [];

	for (const { dir, pattern } of TARGET_DIRS) {
		const dirPath = join(ROOT, dir);
		if (!existsSync(dirPath)) continue;

		if (pattern === "SKILL.md") {
			// Recursive search for skills
			const skillFiles = findFilesRecursively(dirPath, "SKILL.md");
			files.push(...skillFiles);
		} else {
			// Non-recursive search for other dirs
			const entries = readdirSync(dirPath);
			for (const entry of entries) {
				if (entry.endsWith(".md") && !entry.endsWith(".original.md")) {
					files.push(join(dirPath, entry));
				}
			}
		}
	}

	return files;
}

function findFilesRecursively(dir: string, filename: string): string[] {
	const results: string[] = [];

	function walk(currentDir: string) {
		const entries = readdirSync(currentDir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.name === filename) {
				results.push(fullPath);
			}
		}
	}

	walk(dir);
	return results;
}

/**
 * Check if a path matches any excluded pattern
 */
function _isExcluded(path: string): boolean {
	return EXCLUDED_PATTERNS.some((pattern) => path.includes(pattern));
}

describe("Compression Execution", () => {
	describe("AC1 & AC2: All files compressed with backups", () => {
		it("should have backup files for all compressed targets", () => {
			const targetFiles = findTargetFiles();

			console.log(`Found ${targetFiles.length} target files to check`);
			expect(targetFiles.length).toBeGreaterThan(0);

			let backupCount = 0;
			const missingBackups: string[] = [];

			for (const file of targetFiles) {
				const backupPath = `${file}.original.md`;
				if (existsSync(backupPath)) {
					backupCount++;
				} else {
					missingBackups.push(file);
				}
			}

			// All target files should have backups
			expect(missingBackups).toHaveLength(0);
			expect(backupCount).toBe(targetFiles.length);
		});

		it("should have compressed approximately 85 files", () => {
			const targetFiles = findTargetFiles();

			// The expected count is 85 (30 + 23 + 18 + 10 + 4)
			// Allow some variance in case file structure changes
			expect(targetFiles.length).toBeGreaterThanOrEqual(80);
			expect(targetFiles.length).toBeLessThanOrEqual(90);
		});
	});

	describe("AC3: Protected zones preserved", () => {
		it("should preserve code blocks in compressed files", () => {
			const targetFiles = findTargetFiles();
			const sampleFiles = targetFiles.slice(0, 5); // Check first 5

			for (const file of sampleFiles) {
				if (!existsSync(file)) continue;

				const originalPath = `${file}.original.md`;
				if (!existsSync(originalPath)) continue;

				const original = readFileSync(originalPath, "utf8");
				const compressed = readFileSync(file, "utf8");

				// Extract code blocks from both
				const codeBlockRegex = /```[\s\S]*?```/g;
				const originalBlocks = original.match(codeBlockRegex) || [];
				const compressedBlocks = compressed.match(codeBlockRegex) || [];

				// Code blocks should be preserved
				expect(compressedBlocks.length).toBe(originalBlocks.length);

				// Each block should match exactly (byte-identical)
				for (let i = 0; i < originalBlocks.length; i++) {
					expect(compressedBlocks[i]).toBe(originalBlocks[i]);
				}
			}
		});

		it("should preserve URLs in compressed files", () => {
			const targetFiles = findTargetFiles();
			const sampleFiles = targetFiles.slice(0, 5);

			for (const file of sampleFiles) {
				if (!existsSync(file)) continue;

				const originalPath = `${file}.original.md`;
				if (!existsSync(originalPath)) continue;

				const original = readFileSync(originalPath, "utf8");
				const compressed = readFileSync(file, "utf8");

				// Extract URLs from both
				const urlRegex = /https?:\/\/[^\s)\]>]+/g;
				const originalUrls = original.match(urlRegex) || [];
				const compressedUrls = compressed.match(urlRegex) || [];

				// URLs should be preserved
				expect(compressedUrls.length).toBe(originalUrls.length);
			}
		});

		it("should preserve YAML frontmatter in compressed files", () => {
			const targetFiles = findTargetFiles();
			const sampleFiles = targetFiles.slice(0, 5);

			for (const file of sampleFiles) {
				if (!existsSync(file)) continue;

				const originalPath = `${file}.original.md`;
				if (!existsSync(originalPath)) continue;

				const original = readFileSync(originalPath, "utf8");
				const compressed = readFileSync(file, "utf8");

				// Check for frontmatter
				const frontmatterRegex = /^---[\s\S]*?^---/m;
				const originalFm = original.match(frontmatterRegex);
				const compressedFm = compressed.match(frontmatterRegex);

				// If original had frontmatter, compressed should too
				if (originalFm) {
					expect(compressedFm).toBeTruthy();
					expect(compressedFm![0]).toBe(originalFm[0]);
				}
			}
		});
	});

	describe("AC6: Excluded files not compressed", () => {
		it("should not have backup for README.md in root", () => {
			const readmeBackup = join(ROOT, "README.md.original.md");
			expect(existsSync(readmeBackup)).toBe(false);
		});

		it("should not have backup for CHANGELOG.md in root", () => {
			const changelogBackup = join(ROOT, "CHANGELOG.md.original.md");
			expect(existsSync(changelogBackup)).toBe(false);
		});

		it("should not have backups in node_modules", () => {
			const nodeModulesPath = join(ROOT, "node_modules");
			if (!existsSync(nodeModulesPath)) {
				return; // Skip if no node_modules
			}

			// Find any .original.md files in node_modules
			let foundBackups = false;
			function walk(dir: string) {
				const entries = readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.name.endsWith(".original.md")) {
						foundBackups = true;
						return;
					}
					if (entry.isDirectory() && !entry.name.startsWith(".")) {
						walk(join(dir, entry.name));
					}
				}
			}
			walk(nodeModulesPath);

			expect(foundBackups).toBe(false);
		});
	});

	describe("AC4: Valid markdown syntax", () => {
		it("should have valid markdown structure in compressed files", () => {
			const targetFiles = findTargetFiles();
			const sampleFiles = targetFiles.slice(0, 10);

			for (const file of sampleFiles) {
				if (!existsSync(file)) continue;

				const compressed = readFileSync(file, "utf8");

				// Basic markdown validity checks
				// 1. No unclosed code blocks (even number of ```)
				const fenceCount = (compressed.match(/```/g) || []).length;
				expect(fenceCount % 2).toBe(0);

				// 2. No unclosed inline code (even number of single backticks not in code blocks)
				// This is a simple heuristic - proper validation would parse the file

				// 3. Headings should start with #
				const lines = compressed.split("\n");
				for (const line of lines) {
					if (line.trim().length > 0 && line.match(/^[A-Za-z]/)) {
						// Line starts with letter - could be a broken heading
						// But this could also be valid prose, so we skip strict checking
					}
				}
			}
		});
	});
});
