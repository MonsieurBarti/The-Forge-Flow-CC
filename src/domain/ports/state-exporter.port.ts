import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { StateSnapshot } from "../value-objects/state-snapshot.js";

/**
 * Port for exporting complete project state to a portable snapshot.
 * Implementations extract state from the underlying storage (SQLite, etc.)
 * and produce a JSON-serializable snapshot for git commit.
 *
 * This is the **write path** for state synchronization:
 * SQLite (local) → StateExporter → state-snapshot.json (git branch)
 */
export interface StateExporter {
	/**
	 * Export complete project state to a portable snapshot.
	 * @returns Result containing the snapshot or a domain error
	 */
	export(): Result<StateSnapshot, DomainError>;
}

/**
 * Port for importing project state from a portable snapshot.
 * Implementations hydrate the underlying storage (SQLite, etc.) from
 * a previously exported snapshot.
 *
 * This is the **read path** for state synchronization:
 * state-snapshot.json (git branch) → StateImporter → SQLite (local)
 */
export interface StateImporter {
	/**
	 * Import project state from a portable snapshot.
	 * Replaces existing state (destructive operation).
	 * @param snapshot The state snapshot to import
	 * @returns Result indicating success or domain error
	 */
	import(snapshot: StateSnapshot): Result<void, DomainError>;
}
