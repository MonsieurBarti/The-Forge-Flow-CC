import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleStartupRecovery } from "../application/recovery/handle-startup-recovery.js";
import { NativeBindingError } from "../infrastructure/adapters/sqlite/native-binding-error.js";
import { branchGuardCheckCmd, branchGuardCheckSchema } from "./commands/branch-guard-check.cmd.js";
import { checkpointLoadCmd, checkpointLoadSchema } from "./commands/checkpoint-load.cmd.js";
import { checkpointSaveCmd, checkpointSaveSchema } from "./commands/checkpoint-save.cmd.js";
import { claimCheckStaleCmd, claimCheckStaleSchema } from "./commands/claim-check-stale.cmd.js";
import { composeDetectCmd, composeDetectSchema } from "./commands/compose-detect.cmd.js";
import { depAddCmd, depAddSchema } from "./commands/dep-add.cmd.js";
import { directEditGuardCmd, directEditGuardSchema } from "./commands/direct-edit-guard.cmd.js";
import {
	milestoneAuditStatusCmd,
	milestoneAuditStatusSchema,
} from "./commands/milestone-audit-status.cmd.js";
import { milestoneCloseCmd, milestoneCloseSchema } from "./commands/milestone-close.cmd.js";
import { milestoneCreateCmd, milestoneCreateSchema } from "./commands/milestone-create.cmd.js";
import { milestoneListCmd, milestoneListSchema } from "./commands/milestone-list.cmd.js";
import {
	milestoneRecordAuditCmd,
	milestoneRecordAuditSchema,
} from "./commands/milestone-record-audit.cmd.js";
import { observeHealthCmd, observeHealthSchema } from "./commands/observe-health.cmd.js";
import { observeRecordCmd, observeRecordSchema } from "./commands/observe-record.cmd.js";
import {
	patternsAggregateCmd,
	patternsAggregateSchema,
} from "./commands/patterns-aggregate.cmd.js";
import { patternsExtractCmd, patternsExtractSchema } from "./commands/patterns-extract.cmd.js";
import { patternsRankCmd, patternsRankSchema } from "./commands/patterns-rank.cmd.js";
import { preOpGuardCmd, preOpGuardSchema } from "./commands/pre-op-guard.cmd.js";
import { projectGetCmd, projectGetSchema } from "./commands/project-get.cmd.js";
import { projectInitCmd, projectInitSchema } from "./commands/project-init.cmd.js";
import { getCommandSchema } from "./commands/registry.js";
import { reviewCheckFreshCmd, reviewCheckFreshSchema } from "./commands/review-check-fresh.cmd.js";
import { reviewRecordCmd, reviewRecordSchema } from "./commands/review-record.cmd.js";
import { routingCalibrateCmd, routingCalibrateSchema } from "./commands/routing-calibrate.cmd.js";
import { routingDecideCmd, routingDecideSchema } from "./commands/routing-decide.cmd.js";
import { routingEventCmd, routingEventSchema } from "./commands/routing-event.cmd.js";
import {
	routingJudgePrepareCmd,
	routingJudgePrepareSchema,
} from "./commands/routing-judge-prepare.cmd.js";
import {
	routingJudgeRecordCmd,
	routingJudgeRecordSchema,
} from "./commands/routing-judge-record.cmd.js";
import { routingOutcomeCmd, routingOutcomeSchema } from "./commands/routing-outcome.cmd.js";
import { schemaCmd, schemaCmdSchema } from "./commands/schema.cmd.js";
import { sessionRemindCmd, sessionRemindSchema } from "./commands/session-remind.cmd.js";
import { skillsApproveCmd, skillsApproveSchema } from "./commands/skills-approve.cmd.js";
import { skillsDriftCmd, skillsDriftSchema } from "./commands/skills-drift.cmd.js";
import { skillsValidateCmd, skillsValidateSchema } from "./commands/skills-validate.cmd.js";
import { sliceClassifyCmd, sliceClassifySchema } from "./commands/slice-classify.cmd.js";
import { sliceCloseCmd, sliceCloseSchema } from "./commands/slice-close.cmd.js";
import { sliceCreateCmd, sliceCreateSchema } from "./commands/slice-create.cmd.js";
import { sliceListCmd, sliceListSchema } from "./commands/slice-list.cmd.js";
import { sliceTransitionCmd, sliceTransitionSchema } from "./commands/slice-transition.cmd.js";
import { specEditGuardCmd, specEditGuardSchema } from "./commands/spec-edit-guard.cmd.js";
import { stateDiffCmd, stateDiffSchema } from "./commands/state-diff.cmd.js";
import { syncStateCmd, syncStateSchema } from "./commands/sync-state.cmd.js";
import { taskClaimCmd, taskClaimSchema } from "./commands/task-claim.cmd.js";
import { taskCloseCmd, taskCloseSchema } from "./commands/task-close.cmd.js";
import { taskReadyCmd, taskReadySchema } from "./commands/task-ready.cmd.js";
import { versionCmd, versionSchema } from "./commands/version.cmd.js";
import { wavesDetectCmd, wavesDetectSchema } from "./commands/waves-detect.cmd.js";
import { workflowNextCmd, workflowNextSchema } from "./commands/workflow-next.cmd.js";
import {
	workflowShouldAutoCmd,
	workflowShouldAutoSchema,
} from "./commands/workflow-should-auto.cmd.js";
import { worktreeCreateCmd, worktreeCreateSchema } from "./commands/worktree-create.cmd.js";
import { worktreeDeleteCmd, worktreeDeleteSchema } from "./commands/worktree-delete.cmd.js";
import { worktreeListCmd, worktreeListSchema } from "./commands/worktree-list.cmd.js";
import type { CommandSchema } from "./utils/flag-parser.js";
import { withMutatingCommand } from "./utils/with-mutating-command.js";

type CommandFn = (args: string[]) => Promise<string>;

export interface CommandEntry {
	schema: CommandSchema;
	dispatcher: CommandFn;
}

const wrap = (handler: CommandFn, schema: CommandSchema): CommandFn =>
	schema.mutates === true ? withMutatingCommand(handler) : handler;

export const COMMAND_REGISTRY: Record<string, CommandEntry> = (() => {
	const branchGuardCheckHandler = branchGuardCheckCmd();
	return {
		"branch-guard:check": {
			schema: branchGuardCheckSchema,
			dispatcher: wrap(branchGuardCheckHandler, branchGuardCheckSchema),
		},
		"project:init": {
			schema: projectInitSchema,
			dispatcher: wrap(projectInitCmd, projectInitSchema),
		},
		"project:get": {
			schema: projectGetSchema,
			dispatcher: wrap(projectGetCmd, projectGetSchema),
		},
		"milestone:create": {
			schema: milestoneCreateSchema,
			dispatcher: wrap(milestoneCreateCmd, milestoneCreateSchema),
		},
		"milestone:list": {
			schema: milestoneListSchema,
			dispatcher: wrap(milestoneListCmd, milestoneListSchema),
		},
		"milestone:close": {
			schema: milestoneCloseSchema,
			dispatcher: wrap(milestoneCloseCmd, milestoneCloseSchema),
		},
		"milestone:record-audit": {
			schema: milestoneRecordAuditSchema,
			dispatcher: wrap(milestoneRecordAuditCmd, milestoneRecordAuditSchema),
		},
		"milestone:audit-status": {
			schema: milestoneAuditStatusSchema,
			dispatcher: wrap(milestoneAuditStatusCmd, milestoneAuditStatusSchema),
		},
		"slice:create": {
			schema: sliceCreateSchema,
			dispatcher: wrap(sliceCreateCmd, sliceCreateSchema),
		},
		"slice:list": {
			schema: sliceListSchema,
			dispatcher: wrap(sliceListCmd, sliceListSchema),
		},
		"slice:transition": {
			schema: sliceTransitionSchema,
			dispatcher: wrap(sliceTransitionCmd, sliceTransitionSchema),
		},
		"slice:close": {
			schema: sliceCloseSchema,
			dispatcher: wrap(sliceCloseCmd, sliceCloseSchema),
		},
		"slice:classify": {
			schema: sliceClassifySchema,
			dispatcher: wrap(sliceClassifyCmd, sliceClassifySchema),
		},
		"task:claim": {
			schema: taskClaimSchema,
			dispatcher: wrap(taskClaimCmd, taskClaimSchema),
		},
		"task:close": {
			schema: taskCloseSchema,
			dispatcher: wrap(taskCloseCmd, taskCloseSchema),
		},
		"task:ready": {
			schema: taskReadySchema,
			dispatcher: wrap(taskReadyCmd, taskReadySchema),
		},
		"dep:add": {
			schema: depAddSchema,
			dispatcher: wrap(depAddCmd, depAddSchema),
		},
		"direct-edit:guard": {
			schema: directEditGuardSchema,
			dispatcher: wrap(directEditGuardCmd, directEditGuardSchema),
		},
		"pre-op:guard": {
			schema: preOpGuardSchema,
			dispatcher: wrap(preOpGuardCmd, preOpGuardSchema),
		},
		"spec-edit:guard": {
			schema: specEditGuardSchema,
			dispatcher: wrap(specEditGuardCmd, specEditGuardSchema),
		},
		"waves:detect": {
			schema: wavesDetectSchema,
			dispatcher: wrap(wavesDetectCmd, wavesDetectSchema),
		},
		"state:diff": {
			schema: stateDiffSchema,
			dispatcher: wrap(stateDiffCmd, stateDiffSchema),
		},
		"sync:state": {
			schema: syncStateSchema,
			dispatcher: wrap(syncStateCmd, syncStateSchema),
		},
		"worktree:create": {
			schema: worktreeCreateSchema,
			dispatcher: wrap(worktreeCreateCmd, worktreeCreateSchema),
		},
		"worktree:delete": {
			schema: worktreeDeleteSchema,
			dispatcher: wrap(worktreeDeleteCmd, worktreeDeleteSchema),
		},
		"worktree:list": {
			schema: worktreeListSchema,
			dispatcher: wrap(worktreeListCmd, worktreeListSchema),
		},
		"review:check-fresh": {
			schema: reviewCheckFreshSchema,
			dispatcher: wrap(reviewCheckFreshCmd, reviewCheckFreshSchema),
		},
		"review:record": {
			schema: reviewRecordSchema,
			dispatcher: wrap(reviewRecordCmd, reviewRecordSchema),
		},
		"routing:decide": {
			schema: routingDecideSchema,
			dispatcher: wrap(routingDecideCmd, routingDecideSchema),
		},
		"routing:event": {
			schema: routingEventSchema,
			dispatcher: wrap(routingEventCmd, routingEventSchema),
		},
		"routing:outcome": {
			schema: routingOutcomeSchema,
			dispatcher: wrap(routingOutcomeCmd, routingOutcomeSchema),
		},
		"routing:calibrate": {
			schema: routingCalibrateSchema,
			dispatcher: wrap(routingCalibrateCmd, routingCalibrateSchema),
		},
		"routing:judge-prepare": {
			schema: routingJudgePrepareSchema,
			dispatcher: wrap(routingJudgePrepareCmd, routingJudgePrepareSchema),
		},
		"routing:judge-record": {
			schema: routingJudgeRecordSchema,
			dispatcher: wrap(routingJudgeRecordCmd, routingJudgeRecordSchema),
		},
		"checkpoint:save": {
			schema: checkpointSaveSchema,
			dispatcher: wrap(checkpointSaveCmd, checkpointSaveSchema),
		},
		"checkpoint:load": {
			schema: checkpointLoadSchema,
			dispatcher: wrap(checkpointLoadCmd, checkpointLoadSchema),
		},
		"observe:health": {
			schema: observeHealthSchema,
			dispatcher: wrap(observeHealthCmd, observeHealthSchema),
		},
		"observe:record": {
			schema: observeRecordSchema,
			dispatcher: wrap(observeRecordCmd, observeRecordSchema),
		},
		"patterns:extract": {
			schema: patternsExtractSchema,
			dispatcher: wrap(patternsExtractCmd, patternsExtractSchema),
		},
		"patterns:aggregate": {
			schema: patternsAggregateSchema,
			dispatcher: wrap(patternsAggregateCmd, patternsAggregateSchema),
		},
		"patterns:rank": {
			schema: patternsRankSchema,
			dispatcher: wrap(patternsRankCmd, patternsRankSchema),
		},
		"compose:detect": {
			schema: composeDetectSchema,
			dispatcher: wrap(composeDetectCmd, composeDetectSchema),
		},
		"skills:approve": {
			schema: skillsApproveSchema,
			dispatcher: wrap(skillsApproveCmd, skillsApproveSchema),
		},
		"skills:drift": {
			schema: skillsDriftSchema,
			dispatcher: wrap(skillsDriftCmd, skillsDriftSchema),
		},
		"skills:validate": {
			schema: skillsValidateSchema,
			dispatcher: wrap(skillsValidateCmd, skillsValidateSchema),
		},
		"workflow:next": {
			schema: workflowNextSchema,
			dispatcher: wrap(workflowNextCmd, workflowNextSchema),
		},
		"workflow:should-auto": {
			schema: workflowShouldAutoSchema,
			dispatcher: wrap(workflowShouldAutoCmd, workflowShouldAutoSchema),
		},
		"claim:check-stale": {
			schema: claimCheckStaleSchema,
			dispatcher: wrap(claimCheckStaleCmd, claimCheckStaleSchema),
		},
		"session:remind": {
			schema: sessionRemindSchema,
			dispatcher: wrap(sessionRemindCmd, sessionRemindSchema),
		},
		version: {
			schema: versionSchema,
			dispatcher: wrap(versionCmd, versionSchema),
		},
		schema: {
			schema: schemaCmdSchema,
			dispatcher: wrap(schemaCmd, schemaCmdSchema),
		},
	};
})();

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

	await handleStartupRecovery({ homeDir: join(process.cwd(), ".tff-cc") });

	if (!command || command === "--help" || command === "-h") {
		console.log(
			JSON.stringify({
				ok: true,
				data: {
					name: "tff-tools",
					version: __TFF_VERSION__,
					commands: Object.keys(COMMAND_REGISTRY),
				},
			}),
		);
		return;
	}

	if (command === "--version" || command === "-v") {
		console.log(await versionCmd(args));
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
					availableCommands: Object.keys(COMMAND_REGISTRY).filter((c) => c !== "schema"),
				},
			}),
		);
		return;
	}

	const entry = COMMAND_REGISTRY[command];
	if (!entry) {
		console.log(
			JSON.stringify({
				ok: false,
				error: {
					code: "UNKNOWN_COMMAND",
					message: `Unknown command "${command}". Run --help for available commands.`,
					availableCommands: Object.keys(COMMAND_REGISTRY).filter((c) => c !== "schema"),
				},
			}),
		);
		return;
	}

	const output = await entry.dispatcher(args);
	console.log(output);
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		if (err instanceof NativeBindingError) {
			console.log(JSON.stringify({ ok: false, error: err.toJSON() }));
		} else {
			console.log(
				JSON.stringify({
					ok: false,
					error: { code: "INTERNAL_ERROR", message: String(err) },
				}),
			);
		}
		process.exit(1);
	});
}
