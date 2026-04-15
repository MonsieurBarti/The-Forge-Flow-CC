import type { Candidate } from "../../domain/value-objects/candidate.js";
import type { Pattern } from "../../domain/value-objects/pattern.js";
interface ScoringWeights {
    frequency?: number;
    breadth?: number;
    recency?: number;
    consistency?: number;
}
interface RankOptions {
    totalProjects: number;
    totalSessions: number;
    now: string;
    threshold?: number;
    weights?: ScoringWeights;
}
export declare const rankCandidates: (patterns: Pattern[], options: RankOptions) => Candidate[];
export {};
//# sourceMappingURL=rank-candidates.d.ts.map