import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { ObservationStore } from "../../../domain/ports/observation-store.port.js";
import { Ok, type Result } from "../../../domain/result.js";
import type { Candidate } from "../../../domain/value-objects/candidate.js";
import type { Observation } from "../../../domain/value-objects/observation.js";
import type { Pattern } from "../../../domain/value-objects/pattern.js";

export class JsonlStoreAdapter implements ObservationStore {
	private readonly sessionsPath: string;
	private readonly patternsPath: string;
	private readonly candidatesPath: string;

	constructor(basePath: string) {
		this.sessionsPath = join(basePath, "sessions.jsonl");
		this.patternsPath = join(basePath, "patterns.jsonl");
		this.candidatesPath = join(basePath, "candidates.jsonl");
	}

	async appendObservation(obs: Observation): Promise<Result<void, DomainError>> {
		await mkdir(join(this.sessionsPath, ".."), { recursive: true });
		await appendFile(this.sessionsPath, `${JSON.stringify(obs)}\n`);
		return Ok(undefined);
	}

	async readObservations(): Promise<Result<Observation[], DomainError>> {
		return this.readJsonl<Observation>(this.sessionsPath);
	}

	async writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>> {
		return this.writeJsonl(this.patternsPath, patterns);
	}

	async readPatterns(): Promise<Result<Pattern[], DomainError>> {
		return this.readJsonl<Pattern>(this.patternsPath);
	}

	async writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>> {
		return this.writeJsonl(this.candidatesPath, candidates);
	}

	async readCandidates(): Promise<Result<Candidate[], DomainError>> {
		return this.readJsonl<Candidate>(this.candidatesPath);
	}

	private async readJsonl<T>(path: string): Promise<Result<T[], DomainError>> {
		try {
			const content = await readFile(path, "utf-8");
			const lines = content
				.trim()
				.split("\n")
				.filter((l) => l.length > 0);
			return Ok(lines.map((l) => JSON.parse(l) as T));
		} catch {
			return Ok([]);
		}
	}

	private async writeJsonl<T>(path: string, items: T[]): Promise<Result<void, DomainError>> {
		await mkdir(join(path, ".."), { recursive: true });
		const content = `${items.map((i) => JSON.stringify(i)).join("\n")}\n`;
		await writeFile(path, content);
		return Ok(undefined);
	}
}
