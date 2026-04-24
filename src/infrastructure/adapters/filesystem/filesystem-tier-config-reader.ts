import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
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
	/**
	 * Fallback root for bundled agents/. When `<projectRoot>/agents/<id>.md`
	 * doesn't exist, the reader tries `<pluginRoot>/agents/<id>.md`. null/undefined
	 * = project-only lookup (preserves pre-fallback behavior).
	 */
	pluginRoot?: string | null;
	/**
	 * @deprecated Prefer `projectRoot` alone (agents are auto-resolved at
	 * `<projectRoot>/agents/`) with optional `pluginRoot` fallback. Kept as
	 * an explicit override so existing callers and tests keep working.
	 */
	agentsDir?: string;
}

const DEFAULT_AGENT_MIN_TIER: ModelTier = "haiku";

export class FilesystemTierConfigReader implements TierConfigReader {
	constructor(private readonly opts: FilesystemTierConfigReaderOpts) {}

	async readTierPolicy(): Promise<Result<Record<RiskLevel, ModelTier>, DomainError>> {
		const MAX_SETTINGS_SIZE = 1024 * 1024; // 1 MB
		const path = join(this.opts.projectRoot, ".tff-cc", "settings.yaml");
		let raw = "";
		try {
			raw = await readFile(path, "utf8");
		} catch {
			return Ok(DEFAULT_TIER_POLICY);
		}
		if (raw.length > MAX_SETTINGS_SIZE) return Ok(DEFAULT_TIER_POLICY);
		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			return Ok(DEFAULT_TIER_POLICY);
		}
		const settingsSchema = z
			.object({
				routing: z
					.object({
						tier_policy: z
							.object({
								low: ModelTierSchema.catch(DEFAULT_TIER_POLICY.low),
								medium: ModelTierSchema.catch(DEFAULT_TIER_POLICY.medium),
								high: ModelTierSchema.catch(DEFAULT_TIER_POLICY.high),
							})
							.optional(),
					})
					.optional(),
			})
			.passthrough();
		const settings = settingsSchema.safeParse(parsed);
		if (!settings.success || !settings.data.routing?.tier_policy) return Ok(DEFAULT_TIER_POLICY);
		return Ok(settings.data.routing.tier_policy);
	}

	async readAgentMinTier(agent_id: string): Promise<Result<ModelTier, DomainError>> {
		if (!/^[a-z][a-z0-9-]*$/.test(agent_id)) {
			return Ok(DEFAULT_AGENT_MIN_TIER); // invalid agent_id → safe fallback
		}
		const MAX_AGENT_FILE_SIZE = 1024 * 1024; // 1 MB

		// Candidate agent-file paths tried in order. `agentsDir` (if explicitly
		// provided) is tried first for back-compat; otherwise `<projectRoot>/agents/`
		// is tried, then `<pluginRoot>/agents/` if set.
		const candidatePaths: string[] = [];
		if (this.opts.agentsDir) {
			candidatePaths.push(join(this.opts.agentsDir, `${agent_id}.md`));
		} else {
			candidatePaths.push(join(this.opts.projectRoot, "agents", `${agent_id}.md`));
		}
		if (this.opts.pluginRoot) {
			candidatePaths.push(join(this.opts.pluginRoot, "agents", `${agent_id}.md`));
		}

		let raw = "";
		let found = false;
		for (const candidate of candidatePaths) {
			try {
				raw = await readFile(candidate, "utf8");
				found = true;
				break;
			} catch {
				// try next path
			}
		}
		if (!found) return Ok(DEFAULT_AGENT_MIN_TIER);
		if (raw.length > MAX_AGENT_FILE_SIZE) return Ok(DEFAULT_AGENT_MIN_TIER);
		const match = raw.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return Ok(DEFAULT_AGENT_MIN_TIER);
		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(match[1]);
		} catch {
			return Ok(DEFAULT_AGENT_MIN_TIER);
		}
		const frontmatterSchema = z
			.object({
				routing: z
					.object({
						min_tier: ModelTierSchema.optional(),
					})
					.optional(),
			})
			.passthrough();
		const fm = frontmatterSchema.safeParse(frontmatter);
		if (!fm.success) return Ok(DEFAULT_AGENT_MIN_TIER);
		return Ok(fm.data.routing?.min_tier ?? DEFAULT_AGENT_MIN_TIER);
	}
}
