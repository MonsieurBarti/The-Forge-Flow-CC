import type { CommandSchema } from "../utils/flag-parser.js";
import { branchGuardCheckSchema } from "./branch-guard-check.cmd.js";
import { checkpointLoadSchema } from "./checkpoint-load.cmd.js";
import { checkpointSaveSchema } from "./checkpoint-save.cmd.js";
import { claimCheckStaleSchema } from "./claim-check-stale.cmd.js";
import { composeDetectSchema } from "./compose-detect.cmd.js";
import { depAddSchema } from "./dep-add.cmd.js";
import { directEditGuardSchema } from "./direct-edit-guard.cmd.js";
import { judgePendingClearSchema } from "./judge-pending-clear.cmd.js";
import { judgePendingListSchema } from "./judge-pending-list.cmd.js";
import { milestoneAuditStatusSchema } from "./milestone-audit-status.cmd.js";
import { milestoneCloseSchema } from "./milestone-close.cmd.js";
import { milestoneCreateSchema } from "./milestone-create.cmd.js";
import { milestoneListSchema } from "./milestone-list.cmd.js";
import { milestoneRecordAuditSchema } from "./milestone-record-audit.cmd.js";
import { observeHealthSchema } from "./observe-health.cmd.js";
import { observeRecordSchema } from "./observe-record.cmd.js";
import { patternsAggregateSchema } from "./patterns-aggregate.cmd.js";
import { patternsExtractSchema } from "./patterns-extract.cmd.js";
import { patternsRankSchema } from "./patterns-rank.cmd.js";
import { preOpGuardSchema } from "./pre-op-guard.cmd.js";
import { projectGetSchema } from "./project-get.cmd.js";
import { projectInitSchema } from "./project-init.cmd.js";
import { reviewCheckFreshSchema } from "./review-check-fresh.cmd.js";
import { reviewRecordSchema } from "./review-record.cmd.js";
import { routingCalibrateSchema } from "./routing-calibrate.cmd.js";
import { routingDecideSchema } from "./routing-decide.cmd.js";
import { routingEventSchema } from "./routing-event.cmd.js";
import { routingJudgePrepareSchema } from "./routing-judge-prepare.cmd.js";
import { routingJudgeRecordSchema } from "./routing-judge-record.cmd.js";
import { routingOutcomeSchema } from "./routing-outcome.cmd.js";
import { sessionRemindSchema } from "./session-remind.cmd.js";
import { skillsApproveSchema } from "./skills-approve.cmd.js";
import { skillsDriftSchema } from "./skills-drift.cmd.js";
import { skillsDriftReportSchema } from "./skills-drift-report.cmd.js";
import { skillsValidateSchema } from "./skills-validate.cmd.js";
import { sliceClassifySchema } from "./slice-classify.cmd.js";
import { sliceCloseSchema } from "./slice-close.cmd.js";
import { sliceCreateSchema } from "./slice-create.cmd.js";
import { sliceListSchema } from "./slice-list.cmd.js";
// Import all command schemas
import { sliceTransitionSchema } from "./slice-transition.cmd.js";
import { specEditGuardSchema } from "./spec-edit-guard.cmd.js";
import { stateDiffSchema } from "./state-diff.cmd.js";
import { syncStateSchema } from "./sync-state.cmd.js";
import { taskClaimSchema } from "./task-claim.cmd.js";
import { taskCloseSchema } from "./task-close.cmd.js";
import { taskReadySchema } from "./task-ready.cmd.js";
import { versionSchema } from "./version.cmd.js";
import { wavesDetectSchema } from "./waves-detect.cmd.js";
import { workflowNextSchema } from "./workflow-next.cmd.js";
import { workflowShouldAutoSchema } from "./workflow-should-auto.cmd.js";
import { worktreeCreateSchema } from "./worktree-create.cmd.js";
import { worktreeDeleteSchema } from "./worktree-delete.cmd.js";
import { worktreeListSchema } from "./worktree-list.cmd.js";

/**
 * Registry of all command schemas
 */
const schemaRegistry: Map<string, CommandSchema> = new Map();

// Register all schemas
schemaRegistry.set("slice:transition", sliceTransitionSchema);
schemaRegistry.set("slice:create", sliceCreateSchema);
schemaRegistry.set("slice:list", sliceListSchema);
schemaRegistry.set("slice:close", sliceCloseSchema);
schemaRegistry.set("slice:classify", sliceClassifySchema);
schemaRegistry.set("project:init", projectInitSchema);
schemaRegistry.set("project:get", projectGetSchema);
schemaRegistry.set("milestone:create", milestoneCreateSchema);
schemaRegistry.set("milestone:list", milestoneListSchema);
schemaRegistry.set("milestone:close", milestoneCloseSchema);
schemaRegistry.set("milestone:record-audit", milestoneRecordAuditSchema);
schemaRegistry.set("milestone:audit-status", milestoneAuditStatusSchema);
schemaRegistry.set("task:claim", taskClaimSchema);
schemaRegistry.set("task:close", taskCloseSchema);
schemaRegistry.set("task:ready", taskReadySchema);
schemaRegistry.set("dep:add", depAddSchema);
schemaRegistry.set("direct-edit:guard", directEditGuardSchema);
schemaRegistry.set("pre-op:guard", preOpGuardSchema);
schemaRegistry.set("spec-edit:guard", specEditGuardSchema);
schemaRegistry.set("waves:detect", wavesDetectSchema);
schemaRegistry.set("state:diff", stateDiffSchema);
schemaRegistry.set("sync:state", syncStateSchema);
schemaRegistry.set("worktree:create", worktreeCreateSchema);
schemaRegistry.set("worktree:delete", worktreeDeleteSchema);
schemaRegistry.set("worktree:list", worktreeListSchema);
schemaRegistry.set("review:check-fresh", reviewCheckFreshSchema);
schemaRegistry.set("review:record", reviewRecordSchema);
schemaRegistry.set("routing:decide", routingDecideSchema);
schemaRegistry.set("routing:event", routingEventSchema);
schemaRegistry.set("routing:outcome", routingOutcomeSchema);
schemaRegistry.set("routing:calibrate", routingCalibrateSchema);
schemaRegistry.set("routing:judge-prepare", routingJudgePrepareSchema);
schemaRegistry.set("routing:judge-record", routingJudgeRecordSchema);
schemaRegistry.set("judge:pending:list", judgePendingListSchema);
schemaRegistry.set("judge:pending:clear", judgePendingClearSchema);
schemaRegistry.set("checkpoint:save", checkpointSaveSchema);
schemaRegistry.set("checkpoint:load", checkpointLoadSchema);
schemaRegistry.set("observe:health", observeHealthSchema);
schemaRegistry.set("observe:record", observeRecordSchema);
schemaRegistry.set("patterns:extract", patternsExtractSchema);
schemaRegistry.set("patterns:aggregate", patternsAggregateSchema);
schemaRegistry.set("patterns:rank", patternsRankSchema);
schemaRegistry.set("compose:detect", composeDetectSchema);
schemaRegistry.set("skills:approve", skillsApproveSchema);
schemaRegistry.set("skills:drift", skillsDriftSchema);
schemaRegistry.set("skills:drift-report", skillsDriftReportSchema);
schemaRegistry.set("skills:validate", skillsValidateSchema);
schemaRegistry.set("workflow:next", workflowNextSchema);
schemaRegistry.set("workflow:should-auto", workflowShouldAutoSchema);
schemaRegistry.set("claim:check-stale", claimCheckStaleSchema);
schemaRegistry.set("session:remind", sessionRemindSchema);
schemaRegistry.set("branch-guard:check", branchGuardCheckSchema);
schemaRegistry.set("version", versionSchema);

/**
 * Get a command schema by name
 */
export function getCommandSchema(name: string): CommandSchema | undefined {
	return schemaRegistry.get(name);
}

/**
 * Get all command names
 */
export function getAllCommandNames(): string[] {
	return Array.from(schemaRegistry.keys());
}

/**
 * Get all command schemas
 */
export function getAllSchemas(): CommandSchema[] {
	return Array.from(schemaRegistry.values());
}
