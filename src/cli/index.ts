import { join } from "node:path";
import { recoverOrphans } from "../application/recovery/recover-orphans.js";
import { checkpointLoadCmd } from "./commands/checkpoint-load.cmd.js";
import { checkpointSaveCmd } from "./commands/checkpoint-save.cmd.js";
import { claimCheckStaleCmd } from "./commands/claim-check-stale.cmd.js";
import { composeDetectCmd } from "./commands/compose-detect.cmd.js";
import { depAddCmd } from "./commands/dep-add.cmd.js";
import { directEditGuardCmd } from "./commands/direct-edit-guard.cmd.js";
import { milestoneCloseCmd } from "./commands/milestone-close.cmd.js";
import { milestoneCreateCmd } from "./commands/milestone-create.cmd.js";
import { milestoneListCmd } from "./commands/milestone-list.cmd.js";
import { observeRecordCmd } from "./commands/observe-record.cmd.js";
import { patternsAggregateCmd } from "./commands/patterns-aggregate.cmd.js";
import { patternsExtractCmd } from "./commands/patterns-extract.cmd.js";
import { patternsRankCmd } from "./commands/patterns-rank.cmd.js";
import { preOpGuardCmd } from "./commands/pre-op-guard.cmd.js";
import { projectGetCmd } from "./commands/project-get.cmd.js";
import { projectInitCmd } from "./commands/project-init.cmd.js";
import { getCommandSchema } from "./commands/registry.js";
import { reviewCheckFreshCmd } from "./commands/review-check-fresh.cmd.js";
import { reviewRecordCmd } from "./commands/review-record.cmd.js";
import { routingDecideCmd } from "./commands/routing-decide.cmd.js";
import { routingEventCmd } from "./commands/routing-event.cmd.js";
import { routingOutcomeCmd } from "./commands/routing-outcome.cmd.js";
import { schemaCmd } from "./commands/schema.cmd.js";
import { sessionRemindCmd } from "./commands/session-remind.cmd.js";
import { skillsDriftCmd } from "./commands/skills-drift.cmd.js";
import { skillsValidateCmd } from "./commands/skills-validate.cmd.js";
import { sliceClassifyCmd } from "./commands/slice-classify.cmd.js";
import { sliceCloseCmd } from "./commands/slice-close.cmd.js";
import { sliceCreateCmd } from "./commands/slice-create.cmd.js";
import { sliceListCmd } from "./commands/slice-list.cmd.js";
import { sliceTransitionCmd } from "./commands/slice-transition.cmd.js";
import { specEditGuardCmd } from "./commands/spec-edit-guard.cmd.js";
import { syncStateCmd } from "./commands/sync-state.cmd.js";
import { taskClaimCmd } from "./commands/task-claim.cmd.js";
import { taskCloseCmd } from "./commands/task-close.cmd.js";
import { taskReadyCmd } from "./commands/task-ready.cmd.js";
import { wavesDetectCmd } from "./commands/waves-detect.cmd.js";
import { workflowNextCmd } from "./commands/workflow-next.cmd.js";
import { workflowShouldAutoCmd } from "./commands/workflow-should-auto.cmd.js";
import { worktreeCreateCmd } from "./commands/worktree-create.cmd.js";
import { worktreeDeleteCmd } from "./commands/worktree-delete.cmd.js";
import { worktreeListCmd } from "./commands/worktree-list.cmd.js";
import type { CommandSchema } from "./utils/flag-parser.js";
import { withBranchGuard } from "./utils/with-branch-guard.js";

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
	"project:init": projectInitCmd,
	"project:get": projectGetCmd,
	"milestone:create": withBranchGuard("milestone:create", milestoneCreateCmd),
	"milestone:list": milestoneListCmd,
	"milestone:close": withBranchGuard("milestone:close", milestoneCloseCmd),
	"slice:create": withBranchGuard("slice:create", sliceCreateCmd),
	"slice:list": sliceListCmd,
	"slice:transition": withBranchGuard("slice:transition", sliceTransitionCmd),
	"slice:close": withBranchGuard("slice:close", sliceCloseCmd),
	"slice:classify": sliceClassifyCmd,
	"task:claim": withBranchGuard("task:claim", taskClaimCmd),
	"task:close": withBranchGuard("task:close", taskCloseCmd),
	"task:ready": taskReadyCmd,
	"dep:add": withBranchGuard("dep:add", depAddCmd),
	"direct-edit:guard": directEditGuardCmd,
	"pre-op:guard": preOpGuardCmd,
	"spec-edit:guard": specEditGuardCmd,
	"waves:detect": wavesDetectCmd,
	"sync:state": withBranchGuard("sync:state", syncStateCmd),
	"worktree:create": withBranchGuard("worktree:create", worktreeCreateCmd),
	"worktree:delete": withBranchGuard("worktree:delete", worktreeDeleteCmd),
	"worktree:list": worktreeListCmd,
	"review:check-fresh": reviewCheckFreshCmd,
	"review:record": withBranchGuard("review:record", reviewRecordCmd),
	"routing:decide": withBranchGuard("routing:decide", routingDecideCmd),
	"routing:event": withBranchGuard("routing:event", routingEventCmd),
	"routing:outcome": withBranchGuard("routing:outcome", routingOutcomeCmd),
	"checkpoint:save": withBranchGuard("checkpoint:save", checkpointSaveCmd),
	"checkpoint:load": checkpointLoadCmd,
	"observe:record": withBranchGuard("observe:record", observeRecordCmd),
	"patterns:extract": patternsExtractCmd,
	"patterns:aggregate": patternsAggregateCmd,
	"patterns:rank": patternsRankCmd,
	"compose:detect": composeDetectCmd,
	"skills:drift": skillsDriftCmd,
	"skills:validate": skillsValidateCmd,
	"workflow:next": workflowNextCmd,
	"workflow:should-auto": workflowShouldAutoCmd,
	"claim:check-stale": claimCheckStaleCmd,
	"session:remind": sessionRemindCmd,
	schema: schemaCmd,
};

/**
 * Generate help output for a command
 */
function generateHelp(schema: CommandSchema): string {
	return JSON.stringify({
		ok: true,
		data: {
			name: schema.name,
			purpose: schema.purpose,
			syntax: generateSyntax(schema),
			requiredFlags: schema.requiredFlags.map((f) => ({
				name: `--${f.name}`,
				type: f.type,
				description: f.description,
				enum: f.enum,
				pattern: f.pattern,
			})),
			optionalFlags: schema.optionalFlags.map((f) => ({
				name: `--${f.name}`,
				type: f.type,
				description: f.description,
				enum: f.enum,
				pattern: f.pattern,
			})),
			examples: schema.examples,
		},
	});
}

/**
 * Generate syntax string from schema
 */
function generateSyntax(schema: CommandSchema): string {
	const required = schema.requiredFlags.map((f) => `--${f.name} <${f.type}>`);
	const optional = schema.optionalFlags.map((f) => `[--${f.name}]`);
	return `${schema.name} ${required.join(" ")} ${optional.join(" ")}`.trim();
}

/**
 * Convert a CommandSchema to JSON Schema format
 */
function schemaToJsonSchema(schema: CommandSchema): Record<string, unknown> {
	const properties: Record<string, Record<string, unknown>> = {};
	const required: string[] = [];

	for (const flag of schema.requiredFlags) {
		required.push(flag.name);
		properties[flag.name] = flagToJsonSchema(flag);
	}

	for (const flag of schema.optionalFlags) {
		properties[flag.name] = flagToJsonSchema(flag);
	}

	return {
		type: "object",
		required,
		properties,
	};
}

/**
 * Convert a FlagDefinition to JSON Schema format
 */
function flagToJsonSchema(flag: {
	name: string;
	type: string;
	description: string;
	enum?: string[];
	pattern?: string;
}): Record<string, unknown> {
	const schema: Record<string, unknown> = {
		type: flag.type === "json" ? "object" : flag.type,
		description: flag.description,
	};

	if (flag.enum) {
		schema.enum = flag.enum;
	}

	if (flag.pattern) {
		schema.pattern = flag.pattern;
	}

	return schema;
}

const main = async () => {
	const [command, ...args] = process.argv.slice(2);

	try {
		const result = await recoverOrphans({
			stagingDirs: [join(process.cwd(), ".tff-cc")],
			lockPaths: [],
		});
		if (result.cleanedTmps + result.cleanedLocks > 0) {
			console.error(
				`recovered ${result.cleanedTmps} stale tmp files, ${result.cleanedLocks} stale locks`,
			);
		}
	} catch {
		// best-effort; do not block CLI on recovery failure.
	}

	if (!command || command === "--help" || command === "-h") {
		console.log(
			JSON.stringify({
				ok: true,
				data: { name: "tff-tools", version: __TFF_VERSION__, commands: Object.keys(commands) },
			}),
		);
		return;
	}

	// Handle --help flag for any command
	if (args.includes("--help") || args.includes("-h")) {
		const schema = getCommandSchema(command);
		if (schema) {
			// Check for --json flag - output schema format instead of help format
			if (args.includes("--json")) {
				console.log(
					JSON.stringify({
						ok: true,
						data: {
							command: schema.name,
							flags: schemaToJsonSchema(schema),
						},
					}),
				);
				return;
			}
			console.log(generateHelp(schema));
			return;
		}
		console.log(
			JSON.stringify({
				ok: false,
				error: {
					code: "UNKNOWN_COMMAND",
					message: `Unknown command "${command}". Run --help for available commands.`,
					availableCommands: Object.keys(commands).filter((c) => c !== "schema"),
				},
			}),
		);
		return;
	}

	const handler = commands[command];
	if (!handler) {
		console.log(
			JSON.stringify({
				ok: false,
				error: {
					code: "UNKNOWN_COMMAND",
					message: `Unknown command "${command}". Run --help for available commands.`,
					availableCommands: Object.keys(commands).filter((c) => c !== "schema"),
				},
			}),
		);
		return;
	}

	const output = await handler(args);
	console.log(output);
};

main().catch((err) => {
	console.log(
		JSON.stringify({
			ok: false,
			error: { code: "INTERNAL_ERROR", message: String(err) },
		}),
	);
	process.exit(1);
});
