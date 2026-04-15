import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type { StateImporter } from "../../../domain/ports/state-exporter.port.js";
import type { Result } from "../../../domain/result.js";
import { Err, Ok } from "../../../domain/result.js";
import type { StateSnapshot } from "../../../domain/value-objects/state-snapshot.js";
import type { SQLiteStateAdapter } from "../sqlite/sqlite-state.adapter.js";

/**
 * Imports complete state from portable JSON snapshot into SQLite.
 * Replaces existing state (destructive operation).
 */
export class SQLiteStateImporter implements StateImporter {
	constructor(private readonly adapter: SQLiteStateAdapter) {}

	import(snapshot: StateSnapshot): Result<void, DomainError> {
		try {
			// Ensure schema is initialized first
			this.adapter.init();

			// Access the underlying database handle via adapter's public checkpoint method
			// This is a workaround - we need to clear tables which requires raw SQL
			const db = (
				this.adapter as unknown as {
					db: {
						prepare: (sql: string) => { run: (...params: unknown[]) => void };
						pragma: (s: string) => void;
					};
				}
			).db;

			// Disable FK checks for import: session may reference IDs that don't exist yet
			db.pragma("foreign_keys = OFF");

			try {
				// Clear existing state in dependency-safe order
				// (clear tables with FK refs before tables they reference)
				this.clearTable(db, "review");
				this.clearTable(db, "dependency");
				this.clearTable(db, "workflow_session"); // refs slice/milestone
				this.clearTable(db, "task"); // refs slice
				this.clearTable(db, "slice"); // refs milestone
				this.clearTable(db, "milestone"); // refs project
				this.clearTable(db, "project");

				// Import project (if present)
				if (snapshot.project) {
					const p = snapshot.project;
					db.prepare(
						`INSERT INTO project (id, name, vision, created_at, updated_at)
             VALUES ('singleton', ?, ?, ?, datetime('now'))`,
					).run(p.name, p.vision ?? null, p.createdAt.toISOString());
				}

				// Import milestones
				for (const m of snapshot.milestones) {
					db.prepare(
						`INSERT INTO milestone (id, project_id, number, name, status, close_reason, created_at, updated_at)
             VALUES (?, 'singleton', ?, ?, ?, ?, ?, datetime('now'))`,
					).run(m.id, m.number, m.name, m.status, m.closeReason ?? null, m.createdAt.toISOString());
				}

				// Import slices
				for (const s of snapshot.slices) {
					db.prepare(
						`INSERT INTO slice (id, milestone_id, number, title, status, tier, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
					).run(
						s.id,
						s.milestoneId,
						s.number,
						s.title,
						s.status,
						s.tier ?? null,
						s.createdAt.toISOString(),
					);
				}

				// Import tasks
				for (const t of snapshot.tasks) {
					db.prepare(
						`INSERT INTO task (id, slice_id, number, title, description, status, wave,
                              claimed_at, claimed_by, closed_reason, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
					).run(
						t.id,
						t.sliceId,
						t.number,
						t.title,
						t.description ?? null,
						t.status,
						t.wave ?? null,
						t.claimedAt?.toISOString() ?? null,
						t.claimedBy ?? null,
						t.closedReason ?? null,
						t.createdAt.toISOString(),
					);
				}

				// Import dependencies
				for (const d of snapshot.dependencies) {
					db.prepare(
						`INSERT OR REPLACE INTO dependency (from_id, to_id, type) VALUES (?, ?, ?)`,
					).run(d.fromId, d.toId, d.type);
				}

				// Import session (if present)
				if (snapshot.workflowSession) {
					const s = snapshot.workflowSession;
					db.prepare(
						`INSERT INTO workflow_session (id, phase, active_slice_id, active_milestone_id, paused_at, context_json, updated_at)
             VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
					).run(
						s.phase,
						s.activeSliceId ?? null,
						s.activeMilestoneId ?? null,
						s.pausedAt ?? null,
						s.contextJson ?? null,
					);
				}

				// Import reviews
				for (const r of snapshot.reviews) {
					db.prepare(
						`INSERT INTO review (slice_id, type, reviewer, verdict, commit_sha, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
					).run(
						r.sliceId,
						r.type,
						r.reviewer,
						r.verdict,
						r.commitSha,
						r.notes ?? null,
						r.createdAt,
					);
				}

				// Checkpoint WAL to ensure data is written to main database file
				db.pragma("wal_checkpoint(TRUNCATE)");
			} finally {
				db.pragma("foreign_keys = ON");
			}

			return Ok(undefined);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Err(createDomainError("WRITE_FAILURE", `Import failed: ${message}`));
		}
	}

	private clearTable(
		db: { prepare: (sql: string) => { run: (...params: unknown[]) => void } },
		table: string,
	): void {
		try {
			db.prepare(`DELETE FROM ${table}`).run();
		} catch {
			// Table might not exist yet (schema not initialized)
			// This is fine — we'll create rows on insert
		}
	}
}
