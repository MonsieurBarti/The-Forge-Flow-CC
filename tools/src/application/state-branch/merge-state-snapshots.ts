import type { DomainError } from '../../domain/errors/domain-error.js';
import { syncFailedError } from '../../domain/errors/sync-failed.error.js';
import { Err, Ok, type Result } from '../../domain/result.js';
import type { StateSnapshot } from '../../domain/value-objects/state-snapshot.js';

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
export function mergeStateSnapshots(
  parent: StateSnapshot,
  child: StateSnapshot,
  sliceId: string,
): Result<StateSnapshot, DomainError> {
  try {
    // Validate that child has the specified slice
    const childSlice = child.slices.find((s) => s.id === sliceId);
    if (!childSlice) {
      return Err(
        syncFailedError(`Child snapshot does not contain slice "${sliceId}"`, {
          sliceId,
          availableSlices: child.slices.map((s) => s.id),
        }),
      );
    }

    // Get the task IDs from child that belong to this slice
    const childTaskIds = new Set(child.tasks.filter((t) => t.sliceId === sliceId).map((t) => t.id));

    // 1. Merge slices: child's slice wins
    const mergedSlices = parent.slices.filter((s) => s.id !== sliceId);
    mergedSlices.push(childSlice);

    // 2. Merge tasks: child's tasks for this slice win
    const mergedTasks = parent.tasks.filter((t) => t.sliceId !== sliceId);
    const childTasksForSlice = child.tasks.filter((t) => t.sliceId === sliceId);
    mergedTasks.push(...childTasksForSlice);

    // 3. Merge dependencies: child's dependencies for owned tasks win
    // First, remove parent's dependencies where from_id is in child's tasks
    const mergedDependencies = parent.dependencies.filter((d) => !childTaskIds.has(d.fromId));
    // Then, add child's dependencies where from_id is in child's tasks
    const childDepsForTasks = child.dependencies.filter((d) => childTaskIds.has(d.fromId));
    mergedDependencies.push(...childDepsForTasks);

    // Construct the merged snapshot
    const mergedSnapshot: StateSnapshot = {
      ...parent,
      exportedAt: new Date().toISOString(),
      slices: mergedSlices,
      tasks: mergedTasks,
      dependencies: mergedDependencies,
    };

    return Ok(mergedSnapshot);
  } catch (e) {
    return Err(syncFailedError(`Snapshot merge failed: ${e instanceof Error ? e.message : String(e)}`, { sliceId }));
  }
}
