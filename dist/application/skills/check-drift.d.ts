interface DriftOptions {
    maxDrift?: number;
}
interface DriftResult {
    driftScore: number;
    overThreshold: boolean;
}
export declare const checkDrift: (original: string, current: string, options?: DriftOptions) => DriftResult;
export {};
//# sourceMappingURL=check-drift.d.ts.map