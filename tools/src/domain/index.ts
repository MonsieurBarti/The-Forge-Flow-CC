// Result
export { Ok, Err, isOk, isErr, match } from './result.js';
export type { Result, OkResult, ErrResult } from './result.js';

// Value Objects
export { ComplexityTierSchema, tierConfig } from './value-objects/complexity-tier.js';
export type { ComplexityTier, TierConfig } from './value-objects/complexity-tier.js';
export { SliceStatusSchema, canTransition, validTransitionsFrom } from './value-objects/slice-status.js';
export type { SliceStatus } from './value-objects/slice-status.js';
export { BeadLabelSchema } from './value-objects/bead-label.js';
export type { BeadLabel } from './value-objects/bead-label.js';
export { CommitRefSchema } from './value-objects/commit-ref.js';
export type { CommitRef } from './value-objects/commit-ref.js';
export { WaveSchema } from './value-objects/wave.js';
export type { Wave } from './value-objects/wave.js';
export { SyncReportSchema, emptySyncReport } from './value-objects/sync-report.js';
export type { SyncReport } from './value-objects/sync-report.js';

// Entities
export { ProjectSchema, createProject } from './entities/project.js';
export type { Project } from './entities/project.js';
export { MilestoneSchema, createMilestone, formatMilestoneNumber } from './entities/milestone.js';
export type { Milestone } from './entities/milestone.js';
export { SliceSchema, createSlice, transitionSlice, formatSliceId } from './entities/slice.js';
export type { Slice } from './entities/slice.js';
export { TaskSchema, createTask, startTask, completeTask } from './entities/task.js';
export type { Task } from './entities/task.js';

// Ports
export type { BeadStore, BeadData } from './ports/bead-store.port.js';
export type { ArtifactStore } from './ports/artifact-store.port.js';
export type { GitOps } from './ports/git-ops.port.js';
export type { ReviewStore, ReviewRecord } from './ports/review-store.port.js';

// Observation pipeline value objects
export { ObservationSchema } from './value-objects/observation.js';
export type { Observation } from './value-objects/observation.js';
export { PatternSchema } from './value-objects/pattern.js';
export type { Pattern } from './value-objects/pattern.js';
export { CandidateSchema, CandidateEvidenceSchema } from './value-objects/candidate.js';
export type { Candidate, CandidateEvidence } from './value-objects/candidate.js';

// Observation store port
export type { ObservationStore } from './ports/observation-store.port.js';

// Errors
export { DomainErrorSchema, createDomainError } from './errors/domain-error.js';
export type { DomainError, DomainErrorCode } from './errors/domain-error.js';
export { projectExistsError } from './errors/project-exists.error.js';
export { invalidTransitionError } from './errors/invalid-transition.error.js';
export { syncConflictError } from './errors/sync-conflict.error.js';
export { freshReviewerViolationError } from './errors/fresh-reviewer-violation.error.js';

// Events
export { createDomainEvent } from './events/domain-event.js';
export type { DomainEvent, DomainEventType } from './events/domain-event.js';
export { slicePlannedEvent } from './events/slice-planned.event.js';
export { sliceStatusChangedEvent } from './events/slice-status-changed.event.js';
export { taskCompletedEvent } from './events/task-completed.event.js';
export { syncConflictEvent } from './events/sync-conflict.event.js';
