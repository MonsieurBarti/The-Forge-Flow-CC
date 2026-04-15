import type { Pattern } from "../../domain/value-objects/pattern.js";
interface AggregateOptions {
    minCount?: number;
    totalSessions?: number;
    noiseThreshold?: number;
}
export declare const aggregatePatterns: (patterns: Pattern[], options?: AggregateOptions) => Pattern[];
export {};
//# sourceMappingURL=aggregate-patterns.d.ts.map