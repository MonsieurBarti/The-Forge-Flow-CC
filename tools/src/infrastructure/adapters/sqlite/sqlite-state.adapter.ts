import Database from 'better-sqlite3';
import type { Project } from '../../../domain/entities/project.js';
import type { Milestone } from '../../../domain/entities/milestone.js';
import { formatMilestoneNumber } from '../../../domain/entities/milestone.js';
import type { DomainError } from '../../../domain/errors/domain-error.js';
import { createDomainError } from '../../../domain/errors/domain-error.js';
import { hasOpenChildrenError } from '../../../domain/errors/has-open-children.error.js';
import { Ok, Err, type Result } from '../../../domain/result.js';
import type { ProjectProps } from '../../../domain/value-objects/project-props.js';
import type { MilestoneProps } from '../../../domain/value-objects/milestone-props.js';
import type { MilestoneUpdateProps } from '../../../domain/value-objects/milestone-update-props.js';
import type { WorkflowSession } from '../../../domain/value-objects/workflow-session.js';
import type { DatabaseInit } from '../../../domain/ports/database-init.port.js';
import type { ProjectStore } from '../../../domain/ports/project-store.port.js';
import type { MilestoneStore } from '../../../domain/ports/milestone-store.port.js';
import type { SessionStore } from '../../../domain/ports/session-store.port.js';
import { runMigrations } from './schema.js';

export class SQLiteStateAdapter implements DatabaseInit, ProjectStore, MilestoneStore, SessionStore {
  constructor(private db: Database.Database) {}

  static create(dbPath: string): SQLiteStateAdapter {
    const db = new Database(dbPath);
    return new SQLiteStateAdapter(db);
  }

  static createInMemory(): SQLiteStateAdapter {
    const db = new Database(':memory:');
    return new SQLiteStateAdapter(db);
  }

  // DatabaseInit
  init(): Result<void, DomainError> {
    try {
      runMigrations(this.db);
      return Ok(undefined);
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Migration failed: ${e}`));
    }
  }

  // ProjectStore
  getProject(): Result<Project | null, DomainError> {
    try {
      const row = this.db
        .prepare("SELECT id, name, vision, created_at FROM project WHERE id = 'singleton'")
        .get() as { id: string; name: string; vision: string | null; created_at: string } | undefined;
      if (!row) return Ok(null);
      return Ok({
        id: row.id,
        name: row.name,
        vision: row.vision ?? undefined,
        createdAt: new Date(row.created_at),
      });
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to get project: ${e}`));
    }
  }

  saveProject(props: ProjectProps): Result<Project, DomainError> {
    try {
      const now = new Date().toISOString();
      this.db
        .prepare(
          `INSERT INTO project (id, name, vision, created_at, updated_at)
           VALUES ('singleton', ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, vision = excluded.vision, updated_at = excluded.updated_at`,
        )
        .run(props.name, props.vision ?? null, now, now);
      const project: Project = {
        id: 'singleton',
        name: props.name,
        vision: props.vision,
        createdAt: new Date(now),
      };
      return Ok(project);
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to save project: ${e}`));
    }
  }

  // MilestoneStore
  createMilestone(props: MilestoneProps): Result<Milestone, DomainError> {
    try {
      const id = formatMilestoneNumber(props.number);
      const now = new Date().toISOString();
      this.db
        .prepare(
          `INSERT INTO milestone (id, project_id, number, name, status, created_at, updated_at)
           VALUES (?, 'singleton', ?, ?, 'open', ?, ?)`,
        )
        .run(id, props.number, props.name, now, now);
      return Ok({
        id,
        projectId: 'singleton',
        number: props.number,
        name: props.name,
        status: 'open' as const,
        createdAt: new Date(now),
      });
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to create milestone: ${e}`));
    }
  }

  getMilestone(id: string): Result<Milestone | null, DomainError> {
    try {
      const row = this.db.prepare('SELECT * FROM milestone WHERE id = ?').get(id) as
        | {
            id: string;
            project_id: string;
            number: number;
            name: string;
            status: string;
            close_reason: string | null;
            created_at: string;
          }
        | undefined;
      if (!row) return Ok(null);
      return Ok(this.rowToMilestone(row));
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to get milestone: ${e}`));
    }
  }

  listMilestones(): Result<Milestone[], DomainError> {
    try {
      const rows = this.db.prepare('SELECT * FROM milestone ORDER BY number').all() as Array<{
        id: string;
        project_id: string;
        number: number;
        name: string;
        status: string;
        close_reason: string | null;
        created_at: string;
      }>;
      return Ok(rows.map((r) => this.rowToMilestone(r)));
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to list milestones: ${e}`));
    }
  }

  updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError> {
    try {
      const sets: string[] = [];
      const values: unknown[] = [];
      if (updates.name !== undefined) {
        sets.push('name = ?');
        values.push(updates.name);
      }
      if (updates.status !== undefined) {
        sets.push('status = ?');
        values.push(updates.status);
      }
      if (sets.length === 0) return Ok(undefined);
      sets.push("updated_at = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE milestone SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      return Ok(undefined);
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to update milestone: ${e}`));
    }
  }

  closeMilestone(id: string, reason?: string): Result<void, DomainError> {
    try {
      const openSlices = this.db
        .prepare("SELECT COUNT(*) as count FROM slice WHERE milestone_id = ? AND status != 'closed'")
        .get(id) as { count: number };
      if (openSlices.count > 0) {
        return Err(hasOpenChildrenError(id, openSlices.count));
      }
      this.db
        .prepare(
          "UPDATE milestone SET status = 'closed', close_reason = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .run(reason ?? null, id);
      return Ok(undefined);
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to close milestone: ${e}`));
    }
  }

  // SessionStore
  getSession(): Result<WorkflowSession | null, DomainError> {
    try {
      const row = this.db.prepare('SELECT * FROM workflow_session WHERE id = 1').get() as
        | {
            phase: string;
            active_slice_id: string | null;
            active_milestone_id: string | null;
            paused_at: string | null;
            context_json: string | null;
          }
        | undefined;
      if (!row) return Ok(null);
      return Ok({
        phase: row.phase,
        activeSliceId: row.active_slice_id ?? undefined,
        activeMilestoneId: row.active_milestone_id ?? undefined,
        pausedAt: row.paused_at ?? undefined,
        contextJson: row.context_json ?? undefined,
      });
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to get session: ${e}`));
    }
  }

  saveSession(session: WorkflowSession): Result<void, DomainError> {
    try {
      // Disable FK checks for session save: active_slice_id and active_milestone_id may
      // reference IDs that don't exist yet (e.g. during planning before slices are created).
      this.db.pragma('foreign_keys = OFF');
      try {
        this.db
          .prepare(
            `INSERT INTO workflow_session (id, phase, active_slice_id, active_milestone_id, paused_at, context_json, updated_at)
             VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET phase = excluded.phase, active_slice_id = excluded.active_slice_id,
             active_milestone_id = excluded.active_milestone_id, paused_at = excluded.paused_at,
             context_json = excluded.context_json, updated_at = datetime('now')`,
          )
          .run(
            session.phase,
            session.activeSliceId ?? null,
            session.activeMilestoneId ?? null,
            session.pausedAt ?? null,
            session.contextJson ?? null,
          );
      } finally {
        this.db.pragma('foreign_keys = ON');
      }
      return Ok(undefined);
    } catch (e) {
      return Err(createDomainError('WRITE_FAILURE', `Failed to save session: ${e}`));
    }
  }

  // Helper
  private rowToMilestone(row: {
    id: string;
    project_id: string;
    number: number;
    name: string;
    status: string;
    close_reason: string | null;
    created_at: string;
  }): Milestone {
    return {
      id: row.id,
      projectId: row.project_id,
      number: row.number,
      name: row.name,
      status: row.status as Milestone['status'],
      closeReason: row.close_reason ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
