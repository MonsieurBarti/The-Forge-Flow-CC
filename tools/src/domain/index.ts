// Result

export type { Milestone } from './entities/milestone.js';
export { createMilestone, formatMilestoneNumber, MilestoneSchema } from './entities/milestone.js';
export type { Project } from './entities/project.js';
// Entities
export { createProject, ProjectSchema } from './entities/project.js';
export type { Slice } from './entities/slice.js';
export { createSlice, formatSliceId, SliceSchema, transitionSlice } from './entities/slice.js';
export type { Task } from './entities/task.js';
export { completeTask, createTask, startTask, TaskSchema } from './entities/task.js';
export type { DomainError, DomainErrorCode } from './errors/domain-error.js';
// Errors
export { createDomainError, DomainErrorSchema } from './errors/domain-error.js';
export { freshReviewerViolationError } from './errors/fresh-reviewer-violation.error.js';
export { invalidTransitionError } from './errors/invalid-transition.error.js';
export { projectExistsError } from './errors/project-exists.error.js';
export { syncConflictError } from './errors/sync-conflict.error.js';
export type { DomainEvent, DomainEventType } from './events/domain-event.js';
// Events
export { createDomainEvent } from './events/domain-event.js';
export { slicePlannedEvent } from './events/slice-planned.event.js';
export { sliceStatusChangedEvent } from './events/slice-status-changed.event.js';
export { syncConflictEvent } from './events/sync-conflict.event.js';
export { taskCompletedEvent } from './events/task-completed.event.js';
export type { ArtifactStore } from './ports/artifact-store.port.js';
// Ports
export type { BeadData, BeadStore } from './ports/bead-store.port.js';
export type { GitOps } from './ports/git-ops.port.js';
// Observation store port
export type { ObservationStore } from './ports/observation-store.port.js';
export type { ReviewRecord, ReviewStore } from './ports/review-store.port.js';
export type { ErrResult, OkResult, Result } from './result.js';
export { Err, isErr, isOk, match, Ok } from './result.js';
export type { BeadLabel } from './value-objects/bead-label.js';
export { BeadLabelSchema } from './value-objects/bead-label.js';
export type { Candidate, CandidateEvidence } from './value-objects/candidate.js';
export { CandidateEvidenceSchema, CandidateSchema } from './value-objects/candidate.js';
export type { CommitRef } from './value-objects/commit-ref.js';
export { CommitRefSchema } from './value-objects/commit-ref.js';
export type { ComplexityTier, TierConfig } from './value-objects/complexity-tier.js';
// Value Objects
export { ComplexityTierSchema, tierConfig } from './value-objects/complexity-tier.js';
export type { Observation } from './value-objects/observation.js';
// Observation pipeline value objects
export { ObservationSchema } from './value-objects/observation.js';
export type { Pattern } from './value-objects/pattern.js';
export { PatternSchema } from './value-objects/pattern.js';
export type { SliceStatus } from './value-objects/slice-status.js';
export { canTransition, SliceStatusSchema, validTransitionsFrom } from './value-objects/slice-status.js';
export type { SyncReport } from './value-objects/sync-report.js';
export { emptySyncReport, SyncReportSchema } from './value-objects/sync-report.js';
export type { Wave } from './value-objects/wave.js';
export { WaveSchema } from './value-objects/wave.js';
