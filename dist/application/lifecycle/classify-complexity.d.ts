import type { ComplexityTier } from "../../domain/value-objects/complexity-tier.js";
type RiskLevel = "low" | "medium" | "high";
interface ComplexitySignals {
    taskCount: number;
    estimatedFilesAffected: number;
    newFilesCreated: number;
    modulesAffected: number;
    hasExternalIntegrations: boolean;
    requiresInvestigation: boolean;
    architectureImpact: boolean;
    unknownsSurfaced: number;
    riskLevel: RiskLevel;
}
export declare const classifyComplexity: (signals: ComplexitySignals) => ComplexityTier;
export {};
//# sourceMappingURL=classify-complexity.d.ts.map