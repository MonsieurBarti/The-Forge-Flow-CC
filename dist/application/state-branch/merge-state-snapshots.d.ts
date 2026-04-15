import type { DomainError } from "../../domain/errors/domain-error.js";
import { type Result } from "../../domain/result.js";
import type { StateSnapshot } from "../../domain/value-objects/state-snapshot.js";
/**
 * Merge two state snapshots following the entity merge rules:
 * - Child's slice (matching sliceId) wins → replace in parent
 * - Child's tasks for that slice win → replace in parent
 * - Child's dependencies for those tasks win → delete parent's matching deps, insert child's
 * - Everything else from parent is preserved
 *
 * @param parent - The parent state snapshot (base)
 * @param child - The child state snapshot (changes to apply)
 * @param sliceId - The slice ID to merge (child's owned entities)
 * @returns Result with the merged snapshot or a DomainError
 */
export declare function mergeStateSnapshots(parent: StateSnapshot, child: StateSnapshot, sliceId: string): Result<StateSnapshot, DomainError>;
//# sourceMappingURL=merge-state-snapshots.d.ts.map