import { generateRecoveryHint, getPrerequisite, isValidOperation, } from "./operation-prerequisites.js";
/**
 * Error thrown when an operation is blocked due to status prerequisites
 */
export class OperationBlockedError extends Error {
    operation;
    currentStatus;
    requiredStatus;
    recoveryHint;
    constructor(result) {
        super(result.message);
        this.name = "OperationBlockedError";
        this.operation = result.operation;
        this.currentStatus = result.currentStatus;
        this.requiredStatus = result.requiredStatus;
        this.recoveryHint = result.recoveryHint;
    }
    /**
     * Format the error as a user-facing message with recovery instructions
     */
    toDisplayString() {
        return `BLOCKED: ${this.message} ${this.recoveryHint}`;
    }
}
/**
 * Validate whether a workflow operation can be executed given the current slice status.
 *
 * @param operation - The workflow operation to validate
 * @param currentStatus - The current status of the slice
 * @returns ValidationResult with allowed flag and recovery information
 * @throws Error if operation is not a valid workflow operation
 */
export function validateOperation(operation, currentStatus) {
    // Validate operation name
    if (!isValidOperation(operation)) {
        throw new Error(`Unknown operation: ${operation}. Supported operations: ${getSupportedOperations().join(", ")}`);
    }
    const prerequisite = getPrerequisite(operation);
    const requiredStatus = prerequisite.requiredStatus;
    // Check if current status matches required status
    const allowed = currentStatus === requiredStatus;
    // Generate appropriate message
    const message = allowed
        ? `Operation '${operation}' is ready to execute (status: ${currentStatus})`
        : `Cannot ${operation} from ${currentStatus}.`;
    // Generate recovery hint for blocked operations
    const recoveryHint = allowed
        ? ""
        : generateRecoveryHint(operation, currentStatus, requiredStatus);
    return {
        allowed,
        operation,
        currentStatus,
        requiredStatus,
        message,
        recoveryHint,
    };
}
/**
 * Assert that an operation can be executed, throwing if blocked.
 *
 * @param operation - The workflow operation to validate
 * @param currentStatus - The current status of the slice
 * @throws OperationBlockedError if the operation is not allowed
 */
export function assertOperationAllowed(operation, currentStatus) {
    const result = validateOperation(operation, currentStatus);
    if (!result.allowed) {
        throw new OperationBlockedError(result);
    }
}
/**
 * Check if an operation is allowed without throwing.
 *
 * @param operation - The workflow operation to check
 * @param currentStatus - The current status of the slice
 * @returns true if the operation is allowed, false otherwise
 */
export function isOperationAllowed(operation, currentStatus) {
    try {
        const result = validateOperation(operation, currentStatus);
        return result.allowed;
    }
    catch {
        // Unknown operations are not allowed
        return false;
    }
}
/**
 * Get prerequisite information for an operation.
 *
 * @param operation - The workflow operation
 * @returns The operation prerequisite definition
 * @throws Error if operation is not valid
 */
export function getOperationPrerequisite(operation) {
    if (!isValidOperation(operation)) {
        throw new Error(`Unknown operation: ${operation}`);
    }
    return getPrerequisite(operation);
}
/**
 * Helper to get supported operations list for error messages
 */
function getSupportedOperations() {
    return ["discuss", "research", "plan", "execute", "verify", "ship", "complete"];
}
//# sourceMappingURL=validate-operation.js.map