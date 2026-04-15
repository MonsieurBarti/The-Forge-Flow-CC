import type { z } from "zod";
import type { ObservationSchema } from "../../domain/value-objects/observation.js";
type Observation = z.infer<typeof ObservationSchema>;
interface ClusterOpts {
    minSessions?: number;
    minPatterns?: number;
    maxJaccardDistance?: number;
}
export interface Cluster {
    tools: string[];
    sessions: number;
    activations: number;
}
export declare function detectClusters(observations: Observation[], opts?: ClusterOpts): Cluster[];
export {};
//# sourceMappingURL=detect-clusters.d.ts.map