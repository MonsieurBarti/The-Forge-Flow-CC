import { type SliceStatus, validTransitionsFrom } from "../../domain/value-objects/slice-status.js";

/**
 * Workflow operation names as they appear in /tff: commands
 */
export type WorkflowOperation =
	| "discuss"
	| "research"
	| "plan"
	| "execute"
	| "verify"
	| "ship"
	| "complete";

/**
 * Defines the prerequisite status and recovery path for a workflow operation
 */
export interface OperationPrerequisite {
	/** The operation name */
	operation: WorkflowOperation;
	/** The required slice status to execute this operation */
	requiredStatus: SliceStatus;
	/** Human-readable description of the operation */
	description: string;
}

/**
 * Mapping of each workflow operation to its required status and recovery information.
 *
 * Recovery hints reference actual /tff: commands that transition to the required status.
 * The hints use validTransitionsFrom() to suggest valid next steps when blocked.
 */
const OPERATION_PREREQUISITES: Record<WorkflowOperation, OperationPrerequisite> = {
	discuss: {
		operation: "discuss",
		requiredStatus: "discussing",
		description: "Open slice for discussion and requirements clarification",
	},
	research: {
		operation: "research",
		requiredStatus: "researching",
		description: "Research technical approaches and gather context",
	},
	plan: {
		operation: "plan",
		requiredStatus: "planning",
		description: "Create or refine the slice execution plan",
	},
	execute: {
		operation: "execute",
		requiredStatus: "executing",
		description: "Execute the planned tasks for the slice",
	},
	verify: {
		operation: "verify",
		requiredStatus: "verifying",
		description: "Verify slice completion against success criteria",
	},
	ship: {
		operation: "ship",
		requiredStatus: "reviewing",
		description: "Ship the completed slice after review",
	},
	complete: {
		operation: "complete",
		requiredStatus: "completing",
		description: "Complete and close the slice",
	},
};

/**
 * Get the prerequisite definition for a workflow operation
 */
export function getPrerequisite(operation: WorkflowOperation): OperationPrerequisite {
	return OPERATION_PREREQUISITES[operation];
}

/**
 * Get all supported workflow operations
 */
export function getSupportedOperations(): readonly WorkflowOperation[] {
	return Object.keys(OPERATION_PREREQUISITES) as WorkflowOperation[];
}

/**
 * Check if a string is a valid workflow operation
 */
export function isValidOperation(operation: string): operation is WorkflowOperation {
	return operation in OPERATION_PREREQUISITES;
}

/**
 * Generate a recovery hint when an operation is blocked due to status mismatch.
 *
 * The hint suggests valid next steps based on the current status and what
 * transitions are available to reach the required status.
 */
export function generateRecoveryHint(
	operation: WorkflowOperation,
	currentStatus: SliceStatus,
	requiredStatus: SliceStatus,
): string {
	// If already at required status (shouldn't happen for blocked ops, but handle gracefully)
	if (currentStatus === requiredStatus) {
		return `Ready to run /tff:${operation}`;
	}

	// Get valid transitions from current status
	const validNextStatuses = validTransitionsFrom(currentStatus);

	// Map status to the command that reaches it
	const statusToCommand: Record<SliceStatus, string> = {
		discussing: "/tff:discuss",
		researching: "/tff:research",
		planning: "/tff:plan",
		executing: "/tff:execute",
		verifying: "/tff:verify",
		reviewing: "/tff:verify", // ship transitions from reviewing, but you get there via verify
		completing: "/tff:complete",
		closed: "/tff:complete",
	};

	// If we can directly transition to the required status
	if (validNextStatuses.includes(requiredStatus)) {
		const command = statusToCommand[requiredStatus];
		return `Run ${command} first.`;
	}

	// If no valid transitions available (e.g., closed slice)
	if (validNextStatuses.length === 0) {
		return `Slice is ${currentStatus}. No further operations available.`;
	}

	// Otherwise, suggest the valid next step(s)
	const nextCommands = validNextStatuses.map((status) => statusToCommand[status]);
	const commandList = nextCommands.join(" or ");
	return `Current status is ${currentStatus}. Next: ${commandList}`;
}

/**
 * Get the required status for an operation
 */
export function getRequiredStatus(operation: WorkflowOperation): SliceStatus {
	return OPERATION_PREREQUISITES[operation].requiredStatus;
}
