import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import {
	DEFAULT_TIER_POLICY,
	type TierConfigReader,
} from "../../../domain/ports/tier-config-reader.port.js";
import { Ok, type Result } from "../../../domain/result.js";
import type { RiskLevel } from "../../../domain/value-objects/signals.js";
import { type ModelTier, ModelTierSchema } from "../../../domain/value-objects/tier-decision.js";

interface FilesystemTierConfigReaderOpts {
	projectRoot: string;
	agentsDir: string;
}

const DEFAULT_AGENT_MIN_TIER: ModelTier = "haiku";

export class FilesystemTierConfigReader implements TierConfigReader {
	constructor(private readonly opts: FilesystemTierConfigReaderOpts) {}

	async readTierPolicy(): Promise<Result<Record<RiskLevel, ModelTier>, DomainError>> {
		const path = join(this.opts.projectRoot, ".tff-cc", "settings.yaml");
		let raw = "";
		try {
			raw = await readFile(path, "utf8");
		} catch {
			return Ok(DEFAULT_TIER_POLICY);
		}
		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			return Ok(DEFAULT_TIER_POLICY);
		}
		const policy = (parsed as { routing?: { tier_policy?: Record<string, string> } } | null)
			?.routing?.tier_policy;
		if (!policy) return Ok(DEFAULT_TIER_POLICY);
		return Ok({
			low: ModelTierSchema.catch(DEFAULT_TIER_POLICY.low).parse(policy.low),
			medium: ModelTierSchema.catch(DEFAULT_TIER_POLICY.medium).parse(policy.medium),
			high: ModelTierSchema.catch(DEFAULT_TIER_POLICY.high).parse(policy.high),
		});
	}

	async readAgentMinTier(agent_id: string): Promise<Result<ModelTier, DomainError>> {
		const path = join(this.opts.agentsDir, `${agent_id}.md`);
		let raw = "";
		try {
			raw = await readFile(path, "utf8");
		} catch {
			return Ok(DEFAULT_AGENT_MIN_TIER);
		}
		const match = raw.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return Ok(DEFAULT_AGENT_MIN_TIER);
		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(match[1]);
		} catch {
			return Ok(DEFAULT_AGENT_MIN_TIER);
		}
		const minTier = (frontmatter as { routing?: { min_tier?: string } } | null)?.routing?.min_tier;
		if (!minTier) return Ok(DEFAULT_AGENT_MIN_TIER);
		return Ok(ModelTierSchema.catch(DEFAULT_AGENT_MIN_TIER).parse(minTier));
	}
}
