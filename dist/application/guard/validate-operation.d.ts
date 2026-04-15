import type { SliceStatus } from "../../domain/value-objects/slice-status.js";
import { type OperationPrerequisite, type WorkflowOperation } from "./operation-prerequisites.js";
/**
 * Result of validating whether an operation can be executed
 */
export interface ValidationResult {
    /** Whether the operation is allowed */
    allowed: boolean;
    /** The operation being validated */
    operation: WorkflowOperation;
    /** Current slice status */
    currentStatus: SliceStatus;
    /** Required status for the operation */
    requiredStatus: SliceStatus;
    /** Human-readable message explaining the result */
    message: string;
    /** Recovery hint when blocked - suggests next steps to reach required status */
    recoveryHint: string;
}
/**
 * Error thrown when an operation is blocked due to status prerequisites
 */
export declare class OperationBlockedError extends Error {
    readonly operation: WorkflowOperation;
    readonly currentStatus: SliceStatus;
    readonly requiredStatus: SliceStatus;
    readonly recoveryHint: string;
    constructor(result: ValidationResult);
    /**
     * Format the error as a user-facing message with recovery instructions
     */
    toDisplayString(): string;
}
/**
 * Validate whether a workflow operation can be executed given the current slice status.
 *
 * @param operation - The workflow operation to validate
 * @param currentStatus - The current status of the slice
 * @returns ValidationResult with allowed flag and recovery information
 * @throws Error if operation is not a valid workflow operation
 */
export declare function validateOperation(operation: string, currentStatus: SliceStatus): ValidationResult;
/**
 * Assert that an operation can be executed, throwing if blocked.
 *
 * @param operation - The workflow operation to validate
 * @param currentStatus - The current status of the slice
 * @throws OperationBlockedError if the operation is not allowed
 */
export declare function assertOperationAllowed(operation: string, currentStatus: SliceStatus): void;
/**
 * Check if an operation is allowed without throwing.
 *
 * @param operation - The workflow operation to check
 * @param currentStatus - The current status of the slice
 * @returns true if the operation is allowed, false otherwise
 */
export declare function isOperationAllowed(operation: string, currentStatus: SliceStatus): boolean;
/**
 * Get prerequisite information for an operation.
 *
 * @param operation - The workflow operation
 * @returns The operation prerequisite definition
 * @throws Error if operation is not valid
 */
export declare function getOperationPrerequisite(operation: string): OperationPrerequisite;
//# sourceMappingURL=validate-operation.d.ts.map