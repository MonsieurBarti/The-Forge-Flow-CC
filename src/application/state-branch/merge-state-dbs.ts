import Database from "better-sqlite3";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { syncFailedError } from "../../domain/errors/sync-failed.error.js";
import { Err, Ok, type Result } from "../../domain/result.js";
import type { MergeResult } from "../../domain/value-objects/merge-result.js";
import { getNativeBindingPath } from "../../infrastructure/adapters/sqlite/load-native-binding.js";
import { runMigrations } from "../../infrastructure/adapters/sqlite/schema.js";

/**
 * Entity-level SQL merge via ATTACH.
 * Child's owned entities (slice + tasks + deps for sliceId) win.
 * Parent's other entities stay untouched.
 */
export function mergeStateDbs(
	parentDbPath: string,
	childDbPath: string,
	sliceId: string,
): Result<MergeResult, DomainError> {
	try {
		const nativeBinding = getNativeBindingPath();
		const dbOpts = nativeBinding ? { nativeBinding } : undefined;

		// Run migrations on both DBs to ensure schema compatibility
		const parentDb = new Database(parentDbPath, dbOpts);
		runMigrations(parentDb);

		const childDb = new Database(childDbPath, dbOpts);
		runMigrations(childDb);
		childDb.close();

		// ATTACH child DB and merge owned entities
		const safePath = childDbPath.replace(/'/g, "''");
		parentDb.exec(`ATTACH DATABASE '${safePath}' AS child`);

		let entitiesMerged = 0;

		// Child's slice wins (owned entity)
		const sliceR = parentDb
			.prepare(
				`INSERT OR REPLACE INTO slice (id, milestone_id, number, title, status, tier, created_at, updated_at)
         SELECT id, milestone_id, number, title, status, tier, created_at, updated_at
         FROM child.slice WHERE id = ?`,
			)
			.run(sliceId);
		entitiesMerged += sliceR.changes;

		// Child's tasks win (owned by slice)
		const taskR = parentDb
			.prepare(
				`INSERT OR REPLACE INTO task (id, slice_id, number, title, description, status, wave, claimed_at, claimed_by, closed_reason, created_at, updated_at)
         SELECT id, slice_id, number, title, description, status, wave, claimed_at, claimed_by, closed_reason, created_at, updated_at
         FROM child.task WHERE slice_id = ?`,
			)
			.run(sliceId);
		entitiesMerged += taskR.changes;

		// Child's dependencies win (for owned tasks)
		parentDb
			.prepare(
				`DELETE FROM dependency WHERE from_id IN (SELECT id FROM child.task WHERE slice_id = ?)`,
			)
			.run(sliceId);
		const depR = parentDb
			.prepare(
				`INSERT INTO dependency (from_id, to_id, type)
         SELECT from_id, to_id, type FROM child.dependency
         WHERE from_id IN (SELECT id FROM child.task WHERE slice_id = ?)`,
			)
			.run(sliceId);
		entitiesMerged += depR.changes;

		parentDb.exec("DETACH DATABASE child");
		parentDb.close();

		return Ok({ entitiesMerged, artifactsCopied: 0 });
	} catch (e) {
		return Err(syncFailedError(`SQL merge failed: ${e instanceof Error ? e.message : String(e)}`));
	}
}
