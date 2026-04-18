import { readFile } from "node:fs/promises";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { ExtractInput, SignalExtractor } from "../../../domain/ports/signal-extractor.port.js";
import { Ok, type Result } from "../../../domain/result.js";
import type { ComplexityLevel, Signals } from "../../../domain/value-objects/signals.js";

const RISK_KEYWORDS: Record<string, string> = {
	auth: "auth",
	authentication: "auth",
	migration: "migrations",
	migrations: "migrations",
	breaking: "breaking",
	security: "security",
	pii: "pii",
	secret: "secret",
	credential: "secret",
};

const complexityFromFileCount = (n: number): ComplexityLevel => {
	if (n >= 15) return "high";
	if (n >= 5) return "medium";
	return "low";
};

export class FilesystemSignalExtractor implements SignalExtractor {
	async extract(input: ExtractInput): Promise<Result<Signals, DomainError>> {
		const specText = input.spec_path ? await readFile(input.spec_path, "utf8").catch(() => "") : "";
		const haystack = `${specText}\n${input.description}`.toLowerCase();

		const tags = new Set<string>();
		for (const [kw, tag] of Object.entries(RISK_KEYWORDS)) {
			if (haystack.includes(kw)) tags.add(tag);
		}

		const complexity = complexityFromFileCount(input.affected_files.length);
		const riskLevel: "low" | "medium" | "high" =
			tags.size >= 2 ? "high" : tags.size === 1 ? "medium" : "low";

		const signals: Signals = {
			complexity,
			risk: { level: riskLevel, tags: Array.from(tags) },
		};
		return Ok(signals);
	}
}
