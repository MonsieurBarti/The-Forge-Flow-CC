import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { WorkflowPool } from "../value-objects/workflow-pool.js";

export interface RoutingConfig {
	enabled: boolean;
	llm_enrichment: {
		enabled: boolean;
		model: string;
		timeout_ms: number;
	};
	confidence_threshold: number;
	logging: { path: string };
}

export interface RoutingConfigReader {
	readConfig(): Promise<Result<RoutingConfig, DomainError>>;
	readPool(workflow_id: string): Promise<Result<WorkflowPool, DomainError>>;
}
