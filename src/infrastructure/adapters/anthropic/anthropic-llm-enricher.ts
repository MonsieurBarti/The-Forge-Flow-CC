import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { LlmEnricher } from "../../../domain/ports/llm-enricher.port.js";
import type { ExtractInput } from "../../../domain/ports/signal-extractor.port.js";
import { Ok, type Result } from "../../../domain/result.js";
import { type Signals, SignalsSchema } from "../../../domain/value-objects/signals.js";

export interface LlmClient {
	complete(args: { model: string; prompt: string; timeout_ms: number }): Promise<string>;
}

export interface AnthropicLlmEnricherOpts {
	client: LlmClient;
	model: string;
	timeout_ms: number;
}

const PROMPT_HEADER =
	"You are a software engineer classifying a proposed code change. Respond ONLY with JSON matching {complexity: 'low'|'medium'|'high', risk: {level: 'low'|'medium'|'high', tags: string[]}}. Tags should be lowercase nouns like 'auth', 'migrations', 'pii', 'breaking'.";

export class AnthropicLlmEnricher implements LlmEnricher {
	constructor(private readonly opts: AnthropicLlmEnricherOpts) {}

	async enrich(signals: Signals, input: ExtractInput): Promise<Result<Signals, DomainError>> {
		const prompt = `${PROMPT_HEADER}\n\nChange description: ${input.description}\nAffected files (${input.affected_files.length}): ${input.affected_files.slice(0, 20).join(", ")}\nCurrent deterministic signals: ${JSON.stringify(signals)}\n\nRefined signals JSON:`;
		let raw: string;
		try {
			raw = await this.opts.client.complete({
				model: this.opts.model,
				prompt,
				timeout_ms: this.opts.timeout_ms,
			});
		} catch {
			return Ok(signals);
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return Ok(signals);
		}
		const validated = SignalsSchema.safeParse(parsed);
		if (!validated.success) return Ok(signals);
		return Ok(validated.data);
	}
}
