import type Database from "better-sqlite3";
import type { Milestone } from "../../../domain/entities/milestone.js";
import type { Project } from "../../../domain/entities/project.js";
import type { Slice } from "../../../domain/entities/slice.js";
import type { Task } from "../../../domain/entities/task.js";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type { Result } from "../../../domain/result.js";
import { Err, Ok } from "../../../domain/result.js";
import type { Dependency } from "../../../domain/value-objects/dependency.js";
import type { ReviewRecord } from "../../../domain/value-objects/review-record.js";
import type { WorkflowSession } from "../../../domain/value-objects/workflow-session.js";
import { openDatabase } from "./open-database.js";

/**
 * Local type for salvaged state (internal to salvage operations).
 * This replaces the deleted StateSnapshot type.
 */
interface SalvagedState {
	version: string;
	exportedAt: string;
	project: Project | null;
	milestones: Milestone[];
	slices: Slice[];
	tasks: Task[];
	dependencies: Dependency[];
	workflowSession: WorkflowSession | null;
	reviews: ReviewRecord[];
}

const SALVAGE_VERSION = "1.0.0";

/**
 * Metadata about the salvage operation.
 */
export interface SalvageMetadata {
	/** Tables that were successfully salvaged */
	tablesSalvaged: string[];
	/** Total rows recovered across all tables */
	rowsRecovered: number;
	/** Notes about corruption encountered during salvage */
	corruptionNotes: string[];
	/** PRAGMA integrity_check result if available */
	integrityCheckResult?: string;
	/** PRAGMA quick_check result if available */
	quickCheckResult?: string;
}

/**
 * Result of a salvage operation containing partial snapshot and metadata.
 */
export interface SalvageResult {
	snapshot: SalvagedState | null;
	metadata: SalvageMetadata;
}

/**
 * Utility class for salvaging data from corrupted SQLite databases.
 * Uses defensive extraction - attempts to recover whatever data is readable.
 *
 * **Salvage path — intentionally bypasses Stage-D adapter invariants**
 * (fresh-reviewer, ship-completeness, milestone-completeness).
 *
 * Rationale: salvage repairs corrupted state that may have been written under
 * pre-invariant rules. Forcing invariants during recovery would make a class
 * of legitimate corrupt-but-repairable DBs unrecoverable. The exemption is
 * confined to this file; all normal write paths continue to enforce the
 * invariants via SQLiteStateAdapter.
 *
 * See docs/superpowers/specs/2026-04-21-stage-d-quality-gate-hardening-design.md
 * (non-goals: "Runtime enforcement that makes bypass impossible").
 */
export class SQLiteSalvage {
	/**
	 * Attempts to salvage data from a corrupted SQLite database.
	 * Opens the database in read-only mode and tries to extract all readable data.
	 *
	 * @param dbPath - Path to the potentially corrupted SQLite file
	 * @returns Result containing salvaged snapshot and metadata, or DomainError on catastrophic failure
	 */
	static salvage(dbPath: string): Result<SalvageResult, DomainError> {
		let db: Database.Database | undefined;

		try {
			// Open in read-only mode with timeout for resilience
			db = openDatabase(dbPath, { readonly: true, timeout: 5000 });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Err(
				createDomainError("CORRUPTED_STATE", `Failed to open database for salvage: ${message}`),
			);
		}

		try {
			const metadata: SalvageMetadata = {
				tablesSalvaged: [],
				rowsRecovered: 0,
				corruptionNotes: [],
			};

			// Run integrity checks to assess corruption scope
			try {
				const integrityResult = db.pragma("integrity_check", { simple: true }) as string;
				metadata.integrityCheckResult = integrityResult;
				if (integrityResult !== "ok") {
					metadata.corruptionNotes.push(`Integrity check: ${integrityResult}`);
				}
			} catch (e) {
				metadata.corruptionNotes.push(`Integrity check failed: ${e}`);
			}

			try {
				const quickCheckResult = db.pragma("quick_check", { simple: true }) as string;
				metadata.quickCheckResult = quickCheckResult;
				if (quickCheckResult !== "ok") {
					metadata.corruptionNotes.push(`Quick check: ${quickCheckResult}`);
				}
			} catch (e) {
				metadata.corruptionNotes.push(`Quick check failed: ${e}`);
			}

			// Attempt to salvage each table individually
			const project = SQLiteSalvage.salvageProject(db, metadata);
			const milestones = SQLiteSalvage.salvageMilestones(db, metadata);
			const slices = SQLiteSalvage.salvageSlices(db, metadata);
			const tasks = SQLiteSalvage.salvageTasks(db, metadata);
			const dependencies = SQLiteSalvage.salvageDependencies(db, metadata);
			const session = SQLiteSalvage.salvageSession(db, metadata);
			const reviews = SQLiteSalvage.salvageReviews(db, metadata);

			// Only create snapshot if we salvaged at least some data
			let snapshot: SalvagedState | null = null;
			if (metadata.tablesSalvaged.length > 0) {
				snapshot = {
					version: SALVAGE_VERSION,
					exportedAt: new Date().toISOString(),
					project,
					milestones,
					slices,
					tasks,
					dependencies,
					workflowSession: session,
					reviews,
				};
			}

			return Ok({ snapshot, metadata });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Err(createDomainError("CORRUPTED_STATE", `Salvage operation failed: ${message}`));
		} finally {
			try {
				db.close();
			} catch {
				// Ignore close errors
			}
		}
	}

	/**
	 * Attempt to salvage project data (singleton table).
	 */
	private static salvageProject(db: Database.Database, metadata: SalvageMetadata): Project | null {
		try {
			const row = db
				.prepare("SELECT id, name, vision, created_at FROM project WHERE id = 'singleton'")
				.get() as
				| { id: string; name: string; vision: string | null; created_at: string }
				| undefined;

			if (!row) {
				metadata.corruptionNotes.push("Project: No project row found");
				return null;
			}

			// Validate required fields
			if (!row.name || typeof row.name !== "string") {
				metadata.corruptionNotes.push("Project: Missing or invalid name field");
				return null;
			}

			if (!row.created_at) {
				metadata.corruptionNotes.push("Project: Missing created_at field");
				return null;
			}

			// Parse date with fallback
			let createdAt: Date;
			try {
				createdAt = new Date(row.created_at);
				if (Number.isNaN(createdAt.getTime())) {
					createdAt = new Date(); // Fallback to now
					metadata.corruptionNotes.push(
						`Project: Invalid created_at date "${row.created_at}", using current time`,
					);
				}
			} catch {
				createdAt = new Date();
				metadata.corruptionNotes.push(
					`Project: Failed to parse created_at "${row.created_at}", using current time`,
				);
			}

			metadata.tablesSalvaged.push("project");
			metadata.rowsRecovered += 1;

			return {
				id: row.id,
				name: row.name,
				vision: row.vision ?? undefined,
				createdAt,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Project: Query failed - ${message}`);
			return null;
		}
	}

	/**
	 * Attempt to salvage milestones data.
	 */
	private static salvageMilestones(db: Database.Database, metadata: SalvageMetadata): Milestone[] {
		const milestones: Milestone[] = [];

		try {
			const rows = db.prepare("SELECT * FROM milestone ORDER BY number").all() as Array<{
				id: string;
				project_id: string;
				number: number;
				name: string;
				status: string;
				branch: string;
				close_reason: string | null;
				created_at: string;
			}>;

			for (const row of rows) {
				try {
					// Validate required fields
					if (!row.id || typeof row.id !== "string") {
						metadata.corruptionNotes.push(`Milestone: Skipping row with invalid id`);
						continue;
					}

					if (!row.name || typeof row.name !== "string") {
						metadata.corruptionNotes.push(`Milestone ${row.id}: Missing or invalid name`);
						continue;
					}

					if (typeof row.number !== "number" || Number.isNaN(row.number)) {
						metadata.corruptionNotes.push(`Milestone ${row.id}: Invalid number`);
						continue;
					}

					// Parse date with fallback
					let createdAt: Date;
					try {
						createdAt = new Date(row.created_at);
						if (Number.isNaN(createdAt.getTime())) {
							createdAt = new Date();
						}
					} catch {
						createdAt = new Date();
					}

					milestones.push({
						id: row.id,
						projectId: row.project_id ?? "singleton",
						number: row.number,
						name: row.name,
						status: (row.status as Milestone["status"]) ?? "open",
						branch: row.branch ?? "",
						closeReason: row.close_reason ?? undefined,
						createdAt,
					});
				} catch (rowError) {
					const message = rowError instanceof Error ? rowError.message : String(rowError);
					metadata.corruptionNotes.push(`Milestone row: ${message}`);
				}
			}

			metadata.tablesSalvaged.push("milestone");
			metadata.rowsRecovered += milestones.length;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Milestones: Query failed - ${message}`);
		}

		return milestones;
	}

	/**
	 * Attempt to salvage slices data.
	 */
	private static salvageSlices(db: Database.Database, metadata: SalvageMetadata): Slice[] {
		const slices: Slice[] = [];

		try {
			const rows = db.prepare("SELECT * FROM slice ORDER BY milestone_id, number").all() as Array<{
				id: string;
				milestone_id: string | null;
				kind: string | null;
				number: number;
				title: string;
				status: string;
				tier: string | null;
				base_branch: string | null;
				branch_name: string | null;
				created_at: string;
			}>;

			for (const row of rows) {
				try {
					// Validate required fields
					if (!row.id || typeof row.id !== "string") {
						metadata.corruptionNotes.push(`Slice: Skipping row with invalid id`);
						continue;
					}

					if (!row.title || typeof row.title !== "string") {
						metadata.corruptionNotes.push(`Slice ${row.id}: Missing or invalid title`);
						continue;
					}

					if (typeof row.number !== "number" || Number.isNaN(row.number)) {
						metadata.corruptionNotes.push(`Slice ${row.id}: Invalid number`);
						continue;
					}

					// Parse date with fallback
					let createdAt: Date;
					try {
						createdAt = new Date(row.created_at);
						if (Number.isNaN(createdAt.getTime())) {
							createdAt = new Date();
						}
					} catch {
						createdAt = new Date();
					}

					slices.push({
						id: row.id,
						milestoneId: row.milestone_id ?? undefined,
						kind: (row.kind as Slice["kind"]) ?? "milestone",
						number: row.number,
						title: row.title,
						status: (row.status as Slice["status"]) ?? "discussing",
						tier: (row.tier as Slice["tier"]) ?? undefined,
						baseBranch: row.base_branch ?? undefined,
						branchName: row.branch_name ?? undefined,
						createdAt,
					});
				} catch (rowError) {
					const message = rowError instanceof Error ? rowError.message : String(rowError);
					metadata.corruptionNotes.push(`Slice row: ${message}`);
				}
			}

			metadata.tablesSalvaged.push("slice");
			metadata.rowsRecovered += slices.length;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Slices: Query failed - ${message}`);
		}

		return slices;
	}

	/**
	 * Attempt to salvage tasks data.
	 */
	private static salvageTasks(db: Database.Database, metadata: SalvageMetadata): Task[] {
		const tasks: Task[] = [];

		try {
			const rows = db.prepare("SELECT * FROM task ORDER BY slice_id, number").all() as Array<{
				id: string;
				slice_id: string;
				number: number;
				title: string;
				description: string | null;
				status: string;
				wave: number | null;
				claimed_at: string | null;
				claimed_by: string | null;
				closed_reason: string | null;
				created_at: string;
			}>;

			for (const row of rows) {
				try {
					// Validate required fields
					if (!row.id || typeof row.id !== "string") {
						metadata.corruptionNotes.push(`Task: Skipping row with invalid id`);
						continue;
					}

					if (!row.title || typeof row.title !== "string") {
						metadata.corruptionNotes.push(`Task ${row.id}: Missing or invalid title`);
						continue;
					}

					if (!row.slice_id || typeof row.slice_id !== "string") {
						metadata.corruptionNotes.push(`Task ${row.id}: Missing or invalid slice_id`);
						continue;
					}

					if (typeof row.number !== "number" || Number.isNaN(row.number)) {
						metadata.corruptionNotes.push(`Task ${row.id}: Invalid number`);
						continue;
					}

					// Parse dates with fallback
					let createdAt: Date;
					try {
						createdAt = new Date(row.created_at);
						if (Number.isNaN(createdAt.getTime())) {
							createdAt = new Date();
						}
					} catch {
						createdAt = new Date();
					}

					let claimedAt: Date | undefined;
					if (row.claimed_at) {
						try {
							claimedAt = new Date(row.claimed_at);
							if (Number.isNaN(claimedAt.getTime())) {
								claimedAt = undefined;
							}
						} catch {
							claimedAt = undefined;
						}
					}

					tasks.push({
						id: row.id,
						sliceId: row.slice_id,
						number: row.number,
						title: row.title,
						description: row.description ?? undefined,
						status: (row.status as Task["status"]) ?? "open",
						wave: row.wave ?? undefined,
						claimedAt,
						claimedBy: row.claimed_by ?? undefined,
						closedReason: row.closed_reason ?? undefined,
						createdAt,
					});
				} catch (rowError) {
					const message = rowError instanceof Error ? rowError.message : String(rowError);
					metadata.corruptionNotes.push(`Task row: ${message}`);
				}
			}

			metadata.tablesSalvaged.push("task");
			metadata.rowsRecovered += tasks.length;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Tasks: Query failed - ${message}`);
		}

		return tasks;
	}

	/**
	 * Attempt to salvage dependencies data.
	 */
	private static salvageDependencies(
		db: Database.Database,
		metadata: SalvageMetadata,
	): Dependency[] {
		const dependencies: Dependency[] = [];

		try {
			const rows = db.prepare("SELECT from_id, to_id, type FROM dependency").all() as Array<{
				from_id: string;
				to_id: string;
				type: string;
			}>;

			for (const row of rows) {
				try {
					// Validate required fields
					if (!row.from_id || typeof row.from_id !== "string") {
						metadata.corruptionNotes.push(`Dependency: Skipping row with invalid from_id`);
						continue;
					}

					if (!row.to_id || typeof row.to_id !== "string") {
						metadata.corruptionNotes.push(`Dependency ${row.from_id}: Missing or invalid to_id`);
						continue;
					}

					if (!row.type || typeof row.type !== "string") {
						metadata.corruptionNotes.push(
							`Dependency ${row.from_id}→${row.to_id}: Missing or invalid type`,
						);
						continue;
					}

					dependencies.push({
						fromId: row.from_id,
						toId: row.to_id,
						type: row.type as "blocks",
					});
				} catch (rowError) {
					const message = rowError instanceof Error ? rowError.message : String(rowError);
					metadata.corruptionNotes.push(`Dependency row: ${message}`);
				}
			}

			metadata.tablesSalvaged.push("dependency");
			metadata.rowsRecovered += dependencies.length;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Dependencies: Query failed - ${message}`);
		}

		return dependencies;
	}

	/**
	 * Attempt to salvage workflow session data.
	 */
	private static salvageSession(
		db: Database.Database,
		metadata: SalvageMetadata,
	): WorkflowSession | null {
		try {
			const row = db.prepare("SELECT * FROM workflow_session WHERE id = 1").get() as
				| {
						phase: string;
						active_slice_id: string | null;
						active_milestone_id: string | null;
						paused_at: string | null;
						context_json: string | null;
				  }
				| undefined;

			if (!row) {
				return null;
			}

			// Validate required fields
			if (!row.phase || typeof row.phase !== "string") {
				metadata.corruptionNotes.push("Workflow session: Missing or invalid phase");
				return null;
			}

			metadata.tablesSalvaged.push("workflow_session");
			metadata.rowsRecovered += 1;

			return {
				phase: row.phase,
				activeSliceId: row.active_slice_id ?? undefined,
				activeMilestoneId: row.active_milestone_id ?? undefined,
				pausedAt: row.paused_at ?? undefined,
				contextJson: row.context_json ?? undefined,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Workflow session: Query failed - ${message}`);
			return null;
		}
	}

	/**
	 * Attempt to salvage reviews data.
	 */
	private static salvageReviews(db: Database.Database, metadata: SalvageMetadata): ReviewRecord[] {
		const reviews: ReviewRecord[] = [];

		try {
			const rows = db.prepare("SELECT * FROM review ORDER BY created_at").all() as Array<{
				slice_id: string;
				type: string;
				reviewer: string;
				verdict: string;
				commit_sha: string;
				notes: string | null;
				created_at: string;
			}>;

			for (const row of rows) {
				try {
					// Validate required fields
					if (!row.slice_id || typeof row.slice_id !== "string") {
						metadata.corruptionNotes.push(`Review: Skipping row with invalid slice_id`);
						continue;
					}

					if (!row.type || typeof row.type !== "string") {
						metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid type`);
						continue;
					}

					if (!row.reviewer || typeof row.reviewer !== "string") {
						metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid reviewer`);
						continue;
					}

					if (!row.verdict || typeof row.verdict !== "string") {
						metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid verdict`);
						continue;
					}

					if (!row.commit_sha || typeof row.commit_sha !== "string") {
						metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid commit_sha`);
						continue;
					}

					if (!row.created_at || typeof row.created_at !== "string") {
						metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid created_at`);
						continue;
					}

					reviews.push({
						sliceId: row.slice_id,
						type: row.type as ReviewRecord["type"],
						reviewer: row.reviewer,
						verdict: row.verdict as ReviewRecord["verdict"],
						commitSha: row.commit_sha,
						notes: row.notes ?? undefined,
						createdAt: row.created_at,
					});
				} catch (rowError) {
					const message = rowError instanceof Error ? rowError.message : String(rowError);
					metadata.corruptionNotes.push(`Review row: ${message}`);
				}
			}

			metadata.tablesSalvaged.push("review");
			metadata.rowsRecovered += reviews.length;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			metadata.corruptionNotes.push(`Reviews: Query failed - ${message}`);
		}

		return reviews;
	}
}
