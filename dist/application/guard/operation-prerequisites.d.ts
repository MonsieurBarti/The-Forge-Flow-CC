import { type SliceStatus } from "../../domain/value-objects/slice-status.js";
/**
 * Workflow operation names as they appear in /tff: commands
 */
export type WorkflowOperation = "discuss" | "research" | "plan" | "execute" | "verify" | "ship" | "complete";
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
 * Get the prerequisite definition for a workflow operation
 */
export declare function getPrerequisite(operation: WorkflowOperation): OperationPrerequisite;
/**
 * Get all supported workflow operations
 */
export declare function getSupportedOperations(): readonly WorkflowOperation[];
/**
 * Check if a string is a valid workflow operation
 */
export declare function isValidOperation(operation: string): operation is WorkflowOperation;
/**
 * Generate a recovery hint when an operation is blocked due to status mismatch.
 *
 * The hint suggests valid next steps based on the current status and what
 * transitions are available to reach the required status.
 */
export declare function generateRecoveryHint(operation: WorkflowOperation, currentStatus: SliceStatus, requiredStatus: SliceStatus): string;
/**
 * Get the required status for an operation
 */
export declare function getRequiredStatus(operation: WorkflowOperation): SliceStatus;
//# sourceMappingURL=operation-prerequisites.d.ts.map