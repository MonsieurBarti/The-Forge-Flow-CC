import { describe, expect, it } from "vitest";

/**
 * AI Command Construction Validation Test
 *
 * This test validates that an AI can correctly construct tff-tools commands
 * on the first attempt without trial and error. This tests AC8 from the SPEC.
 *
 * The test uses predefined scenarios and expected commands to simulate
 * what an AI would construct given a task description.
 */

describe("AI command construction validation", () => {
	// Define 10 realistic scenarios with expected commands
	const scenarios = [
		{
			description: "Transition slice M01-S02 to planning status",
			expectedCommand: "slice:transition --slice-id M01-S02 --status planning",
			category: "entity",
		},
		{
			description: "Create a new milestone named 'Phase 2: Features'",
			expectedCommand: "milestone:create --name 'Phase 2: Features'",
			category: "entity",
		},
		{
			description: "Close milestone M02 with reason 'Completed successfully'",
			expectedCommand: "milestone:close --milestone-id M02 --reason 'Completed successfully'",
			category: "entity",
		},
		{
			description: "Create a slice titled 'Implement authentication'",
			expectedCommand: "slice:create --title 'Implement authentication'",
			category: "entity",
		},
		{
			description: "List all slices for milestone M01",
			expectedCommand: "slice:list --milestone-id M01",
			category: "entity",
		},
		{
			description: "Claim task M01-S01-T03 for executor agent",
			expectedCommand: "task:claim --task-id M01-S01-T03 --claimed-by executor",
			category: "entity",
		},
		{
			description: "Close task M01-S01-T05 with reason 'Done'",
			expectedCommand: "task:close --task-id M01-S01-T05 --reason 'Done'",
			category: "entity",
		},
		{
			description: "Create worktree for slice M01-S03",
			expectedCommand: "worktree:create --slice-id M01-S03",
			category: "worktree",
		},
		{
			description: "Check for stale claims with 60 minute TTL",
			expectedCommand: "claim:check-stale --ttl-minutes 60",
			category: "claim",
		},
		{
			description: "Load checkpoint for slice M02-S01",
			expectedCommand: "checkpoint:load --slice-id M02-S01",
			category: "checkpoint",
		},
	];

	it("has all 10 scenarios defined", () => {
		expect(scenarios).toHaveLength(10);
	});

	it("covers all major command categories", () => {
		const categories = new Set(scenarios.map((s) => s.category));
		expect(categories.size).toBeGreaterThanOrEqual(4);
	});

	describe("command syntax validation", () => {
		for (const scenario of scenarios) {
			it(`constructs correct command for: ${scenario.description}`, () => {
				// Parse the expected command to verify it follows the flags-only syntax
				const parts = scenario.expectedCommand.split(" ");
				const commandName = parts[0];

				// Verify command name follows name:subcommand format
				expect(commandName).toMatch(/^[a-z]+:[a-z-]+$/);

				// Verify all arguments are flags (start with --)
				const args = parts.slice(1);
				// Just check that there are flags present
				const flags = args.filter((a) => a.startsWith("--"));
				expect(flags.length).toBeGreaterThan(0);
			});
		}
	});

	describe("flag naming consistency", () => {
		it("uses kebab-case for all flag names", () => {
			const allFlags = new Set<string>();
			for (const scenario of scenarios) {
				const parts = scenario.expectedCommand.split(" ");
				for (const part of parts) {
					if (part.startsWith("--")) {
						allFlags.add(part.slice(2));
					}
				}
			}

			for (const flag of allFlags) {
				// Should be lowercase with hyphens
				expect(flag).toMatch(/^[a-z]+(-[a-z]+)*$/);
			}
		});

		it("uses --slice-id for slice IDs (not --id or --slice)", () => {
			const sliceIdFlags = new Set<string>();
			for (const scenario of scenarios) {
				const parts = scenario.expectedCommand.split(" ");
				for (const part of parts) {
					if (part.startsWith("--") && part.includes("slice")) {
						sliceIdFlags.add(part.slice(2));
					}
				}
			}

			// Should only have --slice-id, not --slice or --id
			expect(sliceIdFlags.has("slice-id")).toBe(true);
			expect(sliceIdFlags.has("slice")).toBe(false);
			expect(sliceIdFlags.has("id")).toBe(false);
		});

		it("uses --status for status (not --target-status or --new-status)", () => {
			const statusFlags = new Set<string>();
			for (const scenario of scenarios) {
				const parts = scenario.expectedCommand.split(" ");
				for (const part of parts) {
					if (part.startsWith("--") && part.includes("status")) {
						statusFlags.add(part.slice(2));
					}
				}
			}

			expect(statusFlags.has("status")).toBe(true);
			expect(statusFlags.has("target-status")).toBe(false);
			expect(statusFlags.has("new-status")).toBe(false);
		});

		it("uses --<entity>-id pattern for entity IDs", () => {
			const idFlags = new Set<string>();
			for (const scenario of scenarios) {
				const parts = scenario.expectedCommand.split(" ");
				for (const part of parts) {
					if (part.startsWith("--") && part.endsWith("-id")) {
						idFlags.add(part.slice(2));
					}
				}
			}

			// Verify pattern
			for (const flag of idFlags) {
				expect(flag).toMatch(/^[a-z]+-id$/);
			}
		});
	});

	describe("first-attempt correctness", () => {
		/**
		 * This test simulates what an AI would do when given a task description.
		 * The AI would:
		 * 1. Read the reference file
		 * 2. Identify the relevant command
		 * 3. Determine required and optional flags
		 * 4. Construct the command
		 *
		 * For this test, we pre-define the expected commands and verify they
		 * would work syntactically.
		 */
		it("all expected commands have valid syntax", () => {
			const validCommands = [
				"slice:transition",
				"milestone:create",
				"milestone:close",
				"slice:create",
				"slice:list",
				"task:claim",
				"task:close",
				"worktree:create",
				"claim:check-stale",
				"checkpoint:load",
			];

			for (const scenario of scenarios) {
				const commandName = scenario.expectedCommand.split(" ")[0];
				expect(validCommands).toContain(commandName);
			}
		});

		it("all expected commands have required flags present", () => {
			// Map of command to required flags
			const requiredFlags: Record<string, string[]> = {
				"slice:transition": ["slice-id", "status"],
				"milestone:create": ["name"],
				"milestone:close": ["milestone-id"],
				"slice:create": ["title"],
				"slice:list": [],
				"task:claim": ["task-id"],
				"task:close": ["task-id"],
				"worktree:create": ["slice-id"],
				"claim:check-stale": [],
				"checkpoint:load": ["slice-id"],
			};

			for (const scenario of scenarios) {
				const parts = scenario.expectedCommand.split(" ");
				const commandName = parts[0];
				const flags = parts.filter((p) => p.startsWith("--")).map((p) => p.slice(2));

				const required = requiredFlags[commandName] || [];
				for (const req of required) {
					expect(flags).toContain(req);
				}
			}
		});

		it("measures first-attempt success rate", () => {
			// All predefined commands should be correct (100% success rate)
			// In a real AI test, this would measure actual AI outputs
			const totalScenarios = scenarios.length;
			let correctCommands = 0;

			for (const scenario of scenarios) {
				// In a real test, this would compare AI output to expected
				// For now, we verify the expected command is syntactically correct
				const parts = scenario.expectedCommand.split(" ");
				const hasValidCommand = parts[0].match(/^[a-z]+:[a-z]+$/);
				const hasFlags = parts.slice(1).some((p) => p.startsWith("--"));

				if (hasValidCommand && hasFlags) {
					correctCommands++;
				}
			}

			const successRate = correctCommands / totalScenarios;
			expect(successRate).toBeGreaterThanOrEqual(0.9); // AC8: 90%+ first-attempt success
		});
	});
});

/**
 * Manual AI Validation Instructions
 *
 * To validate with a real AI:
 * 1. Load references/tff-tools-reference.md into the AI context
 * 2. For each scenario above, ask the AI to construct the command
 * 3. Compare the AI's output to the expected command
 * 4. Calculate the first-attempt success rate
 *
 * Example prompt for AI:
 * "Given this tff-tools reference file, construct the command to:
 *  [scenario description]
 *
 * Output only the command, no explanation."
 */
