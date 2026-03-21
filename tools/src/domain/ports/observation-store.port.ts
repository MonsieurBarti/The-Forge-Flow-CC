import { type Result } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';
import { type Observation } from '../value-objects/observation.js';
import { type Pattern } from '../value-objects/pattern.js';
import { type Candidate } from '../value-objects/candidate.js';

export interface ObservationStore {
  appendObservation(obs: Observation): Promise<Result<void, DomainError>>;
  readObservations(): Promise<Result<Observation[], DomainError>>;
  writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>>;
  readPatterns(): Promise<Result<Pattern[], DomainError>>;
  writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>>;
  readCandidates(): Promise<Result<Candidate[], DomainError>>;
}
