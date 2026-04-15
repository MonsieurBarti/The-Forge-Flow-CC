import { z } from 'zod';
import { MilestoneSchema } from '../entities/milestone.js';
import { ProjectSchema } from '../entities/project.js';
import { SliceSchema } from '../entities/slice.js';
import { TaskSchema } from '../entities/task.js';
import { DependencySchema } from './dependency.js';
import { ReviewRecordSchema } from './review-record.js';
import { WorkflowSessionSchema } from './workflow-session.js';

/**
 * Schema version for state snapshot migrations.
 * Increment when adding breaking changes to snapshot structure.
 */
export const STATE_SNAPSHOT_VERSION = 1;

/**
 * Complete state snapshot for export/import.
 * Contains all entities needed to reconstruct a project's state.
 */
export const StateSnapshotSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  project: ProjectSchema.nullable(),
  milestones: z.array(MilestoneSchema),
  slices: z.array(SliceSchema),
  tasks: z.array(TaskSchema),
  dependencies: z.array(DependencySchema).default([]),
  workflowSession: WorkflowSessionSchema.nullable().default(null),
  reviews: z.array(ReviewRecordSchema).default([]),
});

export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

/**
 * Migration functions for backward compatibility.
 * Each migration transforms from version N to N+1.
 */
type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  // Future migrations go here
  // 1: (old) => ({ ...old, newField: defaultValue }),
};

/**
 * Migrate a raw snapshot to the current schema version.
 * @throws Error if migration path doesn't exist or version is unsupported
 */
export function migrateSnapshot(raw: Record<string, unknown>): Record<string, unknown> {
  let data = { ...raw };
  let version = typeof data.version === 'number' ? data.version : 0;

  if (version > STATE_SNAPSHOT_VERSION) {
    throw new Error(
      `Snapshot version ${version} is newer than supported version ${STATE_SNAPSHOT_VERSION}. ` +
        'Please update your tooling.',
    );
  }

  while (version < STATE_SNAPSHOT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`No migration found for version ${version} → ${version + 1}`);
    }
    data = migrate(data);
    version++;
    data.version = version;
  }

  return data;
}
