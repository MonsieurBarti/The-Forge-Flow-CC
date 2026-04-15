import type { DomainError } from "../../domain/errors/domain-error.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import { type Result } from "../../domain/result.js";
interface RepairStateBranchesInput {
    dryRun?: boolean;
}
interface RepairStateBranchesOutput {
    created: Array<{
        type: "root" | "milestone" | "slice";
        id: string;
    }>;
    failed: Array<{
        type: "root" | "milestone" | "slice";
        id: string;
        error: string;
    }>;
    skipped: Array<{
        type: "root" | "milestone" | "slice";
        id: string;
        reason: string;
    }>;
}
interface RepairStateBranchesDeps {
    milestoneStore: MilestoneStore;
    sliceStore: SliceStore;
    stateBranch: StateBranchPort;
}
/**
 * Repair missing state branches by creating them from their parents.
 *
 * Scans all milestones and slices, checks if their state branches exist,
 * and creates any missing ones by forking from the appropriate parent.
 *
 * @param input.dryRun - If true, only report what would be created without creating
 * @param deps - Store dependencies
 * @returns Repair report with created/failed/skipped counts
 */
export declare const repairStateBranchesUseCase: (input: RepairStateBranchesInput, deps: RepairStateBranchesDeps) => Promise<Result<RepairStateBranchesOutput, DomainError>>;
export {};
//# sourceMappingURL=repair-state-branches.d.ts.map