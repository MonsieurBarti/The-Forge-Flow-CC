export type RecoveryTier = "T1" | "T2" | "T3";
export interface StateRepairResult {
    readonly action: "restored" | "synthetic" | "failed" | "skipped" | "needs-tiered-recovery";
    readonly reason?: string;
    readonly filesRestored?: number;
    readonly tier?: RecoveryTier;
    readonly durationMs?: number;
    readonly consistent?: boolean;
    readonly regenerated?: boolean;
    readonly milestoneId?: string;
    readonly salvaged?: boolean;
    readonly tablesSalvaged?: string[];
    readonly salvageNotes?: string[];
}
export declare const stateRepairCmd: (args: string[]) => Promise<string>;
//# sourceMappingURL=state-repair.cmd.d.ts.map