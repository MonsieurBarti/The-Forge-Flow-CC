import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../../domain/ports/routing-config-reader.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import type { WorkflowPool } from "../../../domain/value-objects/workflow-pool.js";

const DISABLED_DEFAULT: RoutingConfig = {
	enabled: false,
	llm_enrichment: {
		enabled: false,
		model: "claude-haiku-4-5-20251001",
		timeout_ms: 5000,
	},
	confidence_threshold: 0.5,
	logging: { path: ".tff-cc/logs/routing.jsonl" },
};

export interface YamlRoutingConfigReaderOpts {
	projectRoot: string;
}

export class YamlRoutingConfigReader implements RoutingConfigReader {
	constructor(private readonly opts: YamlRoutingConfigReaderOpts) {}

	async readConfig(): Promise<Result<RoutingConfig, DomainError>> {
		const path = join(this.opts.projectRoot, ".tff-cc", "settings.yaml");
		let raw = "";
		try {
			raw = await readFile(path, "utf8");
		} catch {
			return Ok(DISABLED_DEFAULT);
		}
		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			return Ok(DISABLED_DEFAULT);
		}
		const routing = (parsed as { routing?: Partial<RoutingConfig> } | null)?.routing;
		if (!routing) return Ok(DISABLED_DEFAULT);

		return Ok({
			enabled: routing.enabled ?? false,
			llm_enrichment: {
				enabled: routing.llm_enrichment?.enabled ?? DISABLED_DEFAULT.llm_enrichment.enabled,
				model: routing.llm_enrichment?.model ?? DISABLED_DEFAULT.llm_enrichment.model,
				timeout_ms:
					routing.llm_enrichment?.timeout_ms ?? DISABLED_DEFAULT.llm_enrichment.timeout_ms,
			},
			confidence_threshold: routing.confidence_threshold ?? DISABLED_DEFAULT.confidence_threshold,
			logging: {
				path: routing.logging?.path ?? DISABLED_DEFAULT.logging.path,
			},
		});
	}

	async readPool(_workflow_id: string): Promise<Result<WorkflowPool, DomainError>> {
		// Phase A: readPool is declared-but-unused. Future slice will implement it
		// by reading slash-command frontmatter.
		return Err(
			createDomainError("ROUTING_CONFIG", "readPool() is reserved for a future slice", {
				workflow_id: _workflow_id,
			}),
		);
	}
}
