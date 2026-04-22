import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { WorkflowPool } from "../value-objects/workflow-pool.js";

export interface ModelJudgeConfig {
	enabled: boolean;
	model: string;
	temperature: number;
	max_patch_bytes: number;
	max_spec_bytes: number;
	timeout_ms: number;
}

export interface CalibrationConfig {
	n_min: number;
	debug_join: { enabled: boolean };
	source_weights?: Record<string, number>;
	model_judge?: ModelJudgeConfig;
}

export interface RoutingConfig {
	enabled: boolean;
	confidence_threshold: number;
	logging: { path: string };
	calibration?: CalibrationConfig;
}

export interface RoutingConfigReader {
	readConfig(): Promise<Result<RoutingConfig, DomainError>>;
	readPool(workflow_id: string): Promise<Result<WorkflowPool, DomainError>>;
}
