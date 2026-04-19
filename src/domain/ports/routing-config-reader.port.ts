import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { WorkflowPool } from "../value-objects/workflow-pool.js";

export interface CalibrationConfig {
	n_min: number;
	implicit_weight: number;
	debug_join: { enabled: boolean };
}

export interface RoutingConfig {
	enabled: boolean;
	llm_enrichment: {
		enabled: boolean;
		model: string;
		timeout_ms: number;
	};
	confidence_threshold: number;
	logging: { path: string };
	calibration?: CalibrationConfig;
}

export interface RoutingConfigReader {
	readConfig(): Promise<Result<RoutingConfig, DomainError>>;
	readPool(workflow_id: string): Promise<Result<WorkflowPool, DomainError>>;
}
