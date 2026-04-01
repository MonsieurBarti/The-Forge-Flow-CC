// Result

export type { Milestone } from './entities/milestone.js';
export { createMilestone, formatMilestoneNumber, MilestoneSchema } from './entities/milestone.js';
export type { Project } from './entities/project.js';
// Entities
export { createProject, ProjectSchema } from './entities/project.js';
export type { Slice } from './entities/slice.js';
export { createSlice, formatSliceId, SliceSchema, transitionSlice } from './entities/slice.js';
export type { Task, TaskStatus } from './entities/task.js';
export { completeTask, createTask, startTask, TaskSchema, TaskStatusSchema } from './entities/task.js';
export { alreadyClaimedError } from './errors/already-claimed.error.js';
export type { DomainError, DomainErrorCode } from './errors/domain-error.js';
// Errors
export { createDomainError, DomainErrorSchema } from './errors/domain-error.js';
export { freshReviewerViolationError } from './errors/fresh-reviewer-violation.error.js';
export { hasOpenChildrenError } from './errors/has-open-children.error.js';
export { invalidTransitionError } from './errors/invalid-transition.error.js';
export { projectExistsError } from './errors/project-exists.error.js';
export { syncConflictError } from './errors/sync-conflict.error.js';
export { versionMismatchError } from './errors/version-mismatch.error.js';
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
export type { DatabaseInit } from './ports/database-init.port.js';
export type { DependencyStore } from './ports/dependency-store.port.js';
export type { EventBus } from './ports/event-bus.port.js';
export type { GitOps } from './ports/git-ops.port.js';
export type { JournalRepository } from './ports/journal-repository.port.js';
export type { MilestoneStore } from './ports/milestone-store.port.js';
// Observation store port
export type { ObservationStore } from './ports/observation-store.port.js';
export type { ProjectStore } from './ports/project-store.port.js';
export type { ReviewStore } from './ports/review-store.port.js';
export type { SessionStore } from './ports/session-store.port.js';
export type { SliceStore } from './ports/slice-store.port.js';
export type { TaskStore } from './ports/task-store.port.js';
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
export type { Dependency } from './value-objects/dependency.js';
export { DependencySchema, DependencyTypeSchema } from './value-objects/dependency.js';
// Journal
export type { JournalEntry } from './value-objects/journal-entry.js';
export { JournalEntrySchema } from './value-objects/journal-entry.js';
export type { MilestoneProps } from './value-objects/milestone-props.js';
export { MilestonePropsSchema } from './value-objects/milestone-props.js';
export type { MilestoneStatus } from './value-objects/milestone-status.js';
export { MilestoneStatusSchema } from './value-objects/milestone-status.js';
export type { MilestoneUpdateProps } from './value-objects/milestone-update-props.js';
export { MilestoneUpdatePropsSchema } from './value-objects/milestone-update-props.js';
export type { Observation } from './value-objects/observation.js';
// Observation pipeline value objects
export { ObservationSchema } from './value-objects/observation.js';
export type { Pattern } from './value-objects/pattern.js';
export { PatternSchema } from './value-objects/pattern.js';
export type { ProjectProps } from './value-objects/project-props.js';
export { ProjectPropsSchema } from './value-objects/project-props.js';
export type { ReviewRecord, ReviewType } from './value-objects/review-record.js';
export { ReviewRecordSchema, ReviewTypeSchema } from './value-objects/review-record.js';
export type { SliceProps } from './value-objects/slice-props.js';
export { SlicePropsSchema } from './value-objects/slice-props.js';
export type { SliceStatus } from './value-objects/slice-status.js';
export { canTransition, SliceStatusSchema, validTransitionsFrom } from './value-objects/slice-status.js';
export type { SliceUpdateProps } from './value-objects/slice-update-props.js';
export { SliceUpdatePropsSchema } from './value-objects/slice-update-props.js';
export type { SyncReport } from './value-objects/sync-report.js';
export { emptySyncReport, SyncReportSchema } from './value-objects/sync-report.js';
export type { TaskProps } from './value-objects/task-props.js';
export { TaskPropsSchema } from './value-objects/task-props.js';
export type { TaskUpdateProps } from './value-objects/task-update-props.js';
export { TaskUpdatePropsSchema } from './value-objects/task-update-props.js';
export type { Wave } from './value-objects/wave.js';
export { WaveSchema } from './value-objects/wave.js';
export type { WorkflowSession } from './value-objects/workflow-session.js';
export { WorkflowSessionSchema } from './value-objects/workflow-session.js';
