export interface SpecEditWarning {
    code: "SPEC_EDIT_DETECTED";
    message: string;
    suggestion: string;
}
export interface DetectSpecEditResult {
    warning: SpecEditWarning | null;
    reason: "GUARD_DISABLED" | "NOT_SPEC_FILE" | "SPEC_EDIT_DETECTED" | null;
}
/**
 * Detect if a file path is a SPEC.md edit outside the proper /tff:discuss workflow.
 *
 * Checks:
 * 1. If guards are disabled → return null (no warning)
 * 2. If path is not a SPEC.md file → return null (no warning)
 * 3. Path is SPEC.md → return warning with suggestion to use /tff:discuss
 *
 * @param filePath - The file path to check
 * @returns DetectSpecEditResult with warning and reason code
 */
export declare function detectSpecEdit(filePath: string): DetectSpecEditResult;
//# sourceMappingURL=detect-spec-edit.d.ts.map