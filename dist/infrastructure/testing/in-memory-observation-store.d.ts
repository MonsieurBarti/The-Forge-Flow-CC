import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ObservationStore } from "../../domain/ports/observation-store.port.js";
import { type Result } from "../../domain/result.js";
import type { Candidate } from "../../domain/value-objects/candidate.js";
import type { Observation } from "../../domain/value-objects/observation.js";
import type { Pattern } from "../../domain/value-objects/pattern.js";
export declare class InMemoryObservationStore implements ObservationStore {
    private observations;
    private patterns;
    private candidates;
    appendObservation(obs: Observation): Promise<Result<void, DomainError>>;
    readObservations(): Promise<Result<Observation[], DomainError>>;
    writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>>;
    readPatterns(): Promise<Result<Pattern[], DomainError>>;
    writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>>;
    readCandidates(): Promise<Result<Candidate[], DomainError>>;
    reset(): void;
}
//# sourceMappingURL=in-memory-observation-store.d.ts.map