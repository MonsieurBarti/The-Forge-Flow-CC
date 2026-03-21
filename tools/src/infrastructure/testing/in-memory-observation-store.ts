import { type ObservationStore } from '../../domain/ports/observation-store.port.js';
import { type Observation } from '../../domain/value-objects/observation.js';
import { type Pattern } from '../../domain/value-objects/pattern.js';
import { type Candidate } from '../../domain/value-objects/candidate.js';
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';

export class InMemoryObservationStore implements ObservationStore {
  private observations: Observation[] = [];
  private patterns: Pattern[] = [];
  private candidates: Candidate[] = [];

  async appendObservation(obs: Observation): Promise<Result<void, DomainError>> {
    this.observations.push(obs);
    return Ok(undefined);
  }

  async readObservations(): Promise<Result<Observation[], DomainError>> {
    return Ok([...this.observations]);
  }

  async writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>> {
    this.patterns = patterns;
    return Ok(undefined);
  }

  async readPatterns(): Promise<Result<Pattern[], DomainError>> {
    return Ok([...this.patterns]);
  }

  async writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>> {
    this.candidates = candidates;
    return Ok(undefined);
  }

  async readCandidates(): Promise<Result<Candidate[], DomainError>> {
    return Ok([...this.candidates]);
  }

  reset(): void {
    this.observations = [];
    this.patterns = [];
    this.candidates = [];
  }
}
