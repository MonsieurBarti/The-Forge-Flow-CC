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

const AGENT_ID_REGEX = /^[a-z][a-z0-9-]*$/;
const MAX_YAML_FILE_SIZE = 1024 * 1024; // 1 MB

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
		if (raw.length > MAX_YAML_FILE_SIZE) return Ok(DISABLED_DEFAULT);
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
		const parts = workflow_id.split(":");
		if (parts.length !== 2) {
			return Err(
				createDomainError("ROUTING_CONFIG", `invalid workflow_id format: ${workflow_id}`, {
					workflow_id,
				}),
			);
		}

		// 1. Try settings override first.
		const settingsResult = await this.readPoolFromSettings(workflow_id);
		if (!settingsResult.ok) return settingsResult;

		let agentIds: string[];

		if (settingsResult.data !== undefined) {
			agentIds = settingsResult.data;
		} else {
			// 2. Fall through to frontmatter.
			const frontmatterResult = await this.readPoolFromFrontmatter(workflow_id);
			if (!frontmatterResult.ok) return frontmatterResult;
			if (frontmatterResult.data === undefined) {
				return Err(
					createDomainError("ROUTING_CONFIG", `no pool declared for workflow: ${workflow_id}`, {
						workflow_id,
					}),
				);
			}
			agentIds = frontmatterResult.data;
		}

		// 3. Validate ids.
		if (agentIds.length === 0) {
			return Err(
				createDomainError("ROUTING_CONFIG", `no pool agents defined for workflow: ${workflow_id}`, {
					workflow_id,
				}),
			);
		}
		for (const id of agentIds) {
			if (!AGENT_ID_REGEX.test(id)) {
				return Err(
					createDomainError("ROUTING_CONFIG", `invalid agent id: ${id}`, { workflow_id, id }),
				);
			}
		}
		const seen = new Set<string>();
		for (const id of agentIds) {
			if (seen.has(id)) {
				return Err(
					createDomainError("ROUTING_CONFIG", `duplicate agent id in pool: ${id}`, {
						workflow_id,
						id,
					}),
				);
			}
			seen.add(id);
		}

		// 4. Hydrate all agents.
		const agents: AgentCapability[] = [];
		for (const id of agentIds) {
			const result = await this.hydrateAgentCapability(id);
			if (!result.ok) return result;
			agents.push(result.data);
		}

		// 5. Return pool.
		return Ok({
			workflow_id,
			agents,
			default_agent: agents[0].id,
		});
	}

	private async readPoolFromSettings(
		workflow_id: string,
	): Promise<Result<string[] | undefined, DomainError>> {
		const path = join(this.opts.projectRoot, ".tff-cc", "settings.yaml");
		let raw: string;
		try {
			raw = await readFile(path, "utf8");
		} catch {
			return Ok(undefined);
		}
		if (raw.length > MAX_YAML_FILE_SIZE) return Ok(undefined);

		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			return Err(createDomainError("ROUTING_CONFIG", "settings.yaml parse error", { workflow_id }));
		}

		const SettingsPoolsSchema = z
			.object({
				routing: z
					.object({
						pools: z.record(z.string(), z.array(z.string())).optional(),
					})
					.optional(),
			})
			.passthrough();

		const result = SettingsPoolsSchema.safeParse(parsed);
		if (!result.success) {
			// Only err if the malformed field is present; silently fall-through if it's just missing.
			const hasPools =
				(parsed as { routing?: { pools?: unknown } } | null)?.routing?.pools !== undefined;
			if (hasPools) {
				return Err(
					createDomainError("ROUTING_CONFIG", "settings.yaml routing.pools schema error", {
						workflow_id,
					}),
				);
			}
			return Ok(undefined);
		}

		const pools = result.data.routing?.pools;
		if (!pools || !(workflow_id in pools)) return Ok(undefined);

		return Ok(pools[workflow_id]);
	}

	private async readPoolFromFrontmatter(
		workflow_id: string,
	): Promise<Result<string[] | undefined, DomainError>> {
		const [ns, name] = workflow_id.split(":");
		if (!AGENT_ID_REGEX.test(ns) || !AGENT_ID_REGEX.test(name)) {
			return Err(
				createDomainError("ROUTING_CONFIG", `invalid workflow_id segments: ${workflow_id}`, {
					workflow_id,
				}),
			);
		}
		const commandPath = join(this.opts.projectRoot, "commands", ns, `${name}.md`);

		let raw: string;
		try {
			raw = await readFile(commandPath, "utf8");
		} catch {
			return Ok(undefined);
		}
		if (raw.length > MAX_YAML_FILE_SIZE) return Ok(undefined);

		const match = raw.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return Ok(undefined);

		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(match[1]);
		} catch {
			return Err(
				createDomainError("ROUTING_CONFIG", "agent frontmatter parse error", { workflow_id }),
			);
		}

		const CommandFrontmatterSchema = z
			.object({
				routing: z
					.object({
						pool: z.array(z.string()).optional(),
					})
					.optional(),
			})
			.passthrough();

		const parsed = CommandFrontmatterSchema.safeParse(frontmatter);
		if (!parsed.success) return Ok(undefined);

		const pool = parsed.data.routing?.pool;
		if (pool === undefined) return Ok(undefined);

		return Ok(pool);
	}

	private async hydrateAgentCapability(id: string): Promise<Result<AgentCapability, DomainError>> {
		const agentPath = join(this.opts.projectRoot, "agents", `${id}.md`);

		let raw: string;
		try {
			raw = await readFile(agentPath, "utf8");
		} catch {
			return Err(createDomainError("ROUTING_CONFIG", `agent file not found: ${id}`, { id }));
		}
		if (raw.length > MAX_YAML_FILE_SIZE) {
			return Err(createDomainError("ROUTING_CONFIG", `agent file too large: ${id}`, { id }));
		}

		const match = raw.match(/^---\n([\s\S]*?)\n---/);
		if (!match) {
			return Err(
				createDomainError("ROUTING_CONFIG", `no frontmatter in agent file: ${id}`, { id }),
			);
		}

		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(match[1]);
		} catch {
			return Err(
				createDomainError("ROUTING_CONFIG", `agent frontmatter parse error: ${id}`, { id }),
			);
		}

		const AgentFrontmatterSchema = z
			.object({
				routing: z
					.object({
						handles: z.array(z.string()).default([]),
						priority: z.number().int().default(0),
					})
					.optional(),
			})
			.passthrough();

		const parsed = AgentFrontmatterSchema.safeParse(frontmatter);
		if (!parsed.success) {
			return Err(
				createDomainError("ROUTING_CONFIG", `agent frontmatter schema error: ${id}`, { id }),
			);
		}

		return Ok({
			id,
			handles: parsed.data.routing?.handles ?? [],
			priority: parsed.data.routing?.priority ?? 0,
		});
	}
}
