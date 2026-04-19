import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../../domain/ports/routing-config-reader.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import type { AgentCapability } from "../../../domain/value-objects/agent-capability.js";
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

	async readPool(workflow_id: string): Promise<Result<WorkflowPool, DomainError>> {
		// Convert "tff:ship" → "commands/tff/ship.md"
		const parts = workflow_id.split(":");
		if (parts.length !== 2) {
			return Err(
				createDomainError("ROUTING_CONFIG", `invalid workflow_id format: ${workflow_id}`, {
					workflow_id,
				}),
			);
		}
		const [ns, name] = parts;
		const commandPath = join(this.opts.projectRoot, "commands", ns, `${name}.md`);
		let commandRaw = "";
		try {
			commandRaw = await readFile(commandPath, "utf8");
		} catch {
			return Err(
				createDomainError("ROUTING_CONFIG", `command file not found: ${commandPath}`, {
					workflow_id,
				}),
			);
		}

		const match = commandRaw.match(/^---\n([\s\S]*?)\n---/);
		if (!match) {
			return Err(
				createDomainError("ROUTING_CONFIG", `no frontmatter in command file: ${commandPath}`, {
					workflow_id,
				}),
			);
		}
		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(match[1]);
		} catch {
			return Err(
				createDomainError("ROUTING_CONFIG", `invalid frontmatter YAML in: ${commandPath}`, {
					workflow_id,
				}),
			);
		}

		const CommandFrontmatterSchema = z
			.object({
				routing: z
					.object({
						pool: z.array(z.string()).min(1).optional(),
					})
					.optional(),
			})
			.passthrough();

		const parsed = CommandFrontmatterSchema.safeParse(frontmatter);
		const agentIds = parsed.success ? (parsed.data.routing?.pool ?? []) : [];
		if (agentIds.length === 0) {
			return Err(
				createDomainError("ROUTING_CONFIG", `no pool agents defined for workflow: ${workflow_id}`, {
					workflow_id,
				}),
			);
		}

		const AgentFrontmatterSchema = z
			.object({
				routing: z
					.object({
						handles: z.array(z.string()).default([]),
						priority: z.number().int().default(10),
					})
					.optional(),
			})
			.passthrough();

		const agents: AgentCapability[] = [];
		for (const agentId of agentIds) {
			const agentPath = join(this.opts.projectRoot, "agents", `${agentId}.md`);
			let agentRaw = "";
			try {
				agentRaw = await readFile(agentPath, "utf8");
			} catch {
				agents.push({ id: agentId, handles: [], priority: 10 });
				continue;
			}
			const agentMatch = agentRaw.match(/^---\n([\s\S]*?)\n---/);
			if (!agentMatch) {
				agents.push({ id: agentId, handles: [], priority: 10 });
				continue;
			}
			let agentFm: unknown;
			try {
				agentFm = parseYaml(agentMatch[1]);
			} catch {
				agents.push({ id: agentId, handles: [], priority: 10 });
				continue;
			}
			const fm = AgentFrontmatterSchema.safeParse(agentFm);
			if (!fm.success) {
				agents.push({ id: agentId, handles: [], priority: 10 });
				continue;
			}
			agents.push({
				id: agentId,
				handles: fm.data.routing?.handles ?? [],
				priority: fm.data.routing?.priority ?? 10,
			});
		}

		return Ok({
			workflow_id,
			agents,
			default_agent: agentIds[0],
		});
	}
}
