import type { DomainError } from '../../domain/errors/domain-error.js';
import type { MilestoneStore } from '../../domain/ports/milestone-store.port.js';
import type { SliceStore } from '../../domain/ports/slice-store.port.js';
import type { StateBranchPort } from '../../domain/ports/state-branch.port.js';
import { Err, isOk, Ok, type Result } from '../../domain/result.js';

interface RepairStateBranchesInput {
  dryRun?: boolean;
}

interface RepairStateBranchesOutput {
  created: Array<{ type: 'root' | 'milestone' | 'slice'; id: string }>;
  failed: Array<{ type: 'root' | 'milestone' | 'slice'; id: string; error: string }>;
  skipped: Array<{ type: 'root' | 'milestone' | 'slice'; id: string; reason: string }>;
}

interface RepairStateBranchesDeps {
  milestoneStore: MilestoneStore;
  sliceStore: SliceStore;
  stateBranch: StateBranchPort;
}

/**
 * Repair missing state branches by creating them from their parents.
 *
 * Scans all milestones and slices, checks if their state branches exist,
 * and creates any missing ones by forking from the appropriate parent.
 *
 * @param input.dryRun - If true, only report what would be created without creating
 * @param deps - Store dependencies
 * @returns Repair report with created/failed/skipped counts
 */
export const repairStateBranchesUseCase = async (
  input: RepairStateBranchesInput,
  deps: RepairStateBranchesDeps,
): Promise<Result<RepairStateBranchesOutput, DomainError>> => {
  const result: RepairStateBranchesOutput = {
    created: [],
    failed: [],
    skipped: [],
  };

  // 1. Check/create root state branch
  const rootExists = await deps.stateBranch.exists('main');
  if (!isOk(rootExists)) {
    return Err(rootExists.error);
  }

  if (!rootExists.data) {
    if (input.dryRun) {
      result.skipped.push({ type: 'root', id: 'main', reason: 'Would create (dry-run)' });
    } else {
      const createResult = await deps.stateBranch.createRoot();
      if (isOk(createResult)) {
        result.created.push({ type: 'root', id: 'main' });
      } else {
        result.failed.push({ type: 'root', id: 'main', error: createResult.error.message });
      }
    }
  }

  // 2. Get all milestones
  const milestonesResult = deps.milestoneStore.listMilestones();
  if (!isOk(milestonesResult)) {
    return Err(milestonesResult.error);
  }

  // 3. Check/create milestone state branches
  for (const milestone of milestonesResult.data) {
    const branchName = `milestone/${milestone.id}`;

    const exists = await deps.stateBranch.exists(branchName);
    if (!isOk(exists)) {
      result.failed.push({ type: 'milestone', id: milestone.id, error: exists.error.message });
      continue;
    }

    if (exists.data) {
      result.skipped.push({ type: 'milestone', id: milestone.id, reason: 'Already exists' });
      continue;
    }

    if (input.dryRun) {
      result.skipped.push({ type: 'milestone', id: milestone.id, reason: 'Would create (dry-run)' });
      continue;
    }

    const forkResult = await deps.stateBranch.fork(branchName, 'tff-state/main');
    if (isOk(forkResult)) {
      result.created.push({ type: 'milestone', id: milestone.id });
    } else {
      result.failed.push({ type: 'milestone', id: milestone.id, error: forkResult.error.message });
    }
  }

  // 4. Check/create slice state branches
  for (const milestone of milestonesResult.data) {
    const slicesResult = deps.sliceStore.listSlices(milestone.id);
    if (!isOk(slicesResult)) {
      continue; // Skip this milestone's slices on error
    }

    for (const slice of slicesResult.data) {
      const branchName = `slice/${slice.id}`;
      const parentStateBranch = `tff-state/milestone/${milestone.id}`;

      const exists = await deps.stateBranch.exists(branchName);
      if (!isOk(exists)) {
        result.failed.push({ type: 'slice', id: slice.id, error: exists.error.message });
        continue;
      }

      if (exists.data) {
        result.skipped.push({ type: 'slice', id: slice.id, reason: 'Already exists' });
        continue;
      }

      // Check if parent milestone state branch exists
      const parentExists = await deps.stateBranch.exists(`milestone/${milestone.id}`);
      if (!isOk(parentExists) || !parentExists.data) {
        result.failed.push({
          type: 'slice',
          id: slice.id,
          error: `Parent milestone state branch tff-state/milestone/${milestone.id} not found`,
        });
        continue;
      }

      if (input.dryRun) {
        result.skipped.push({ type: 'slice', id: slice.id, reason: 'Would create (dry-run)' });
        continue;
      }

      const forkResult = await deps.stateBranch.fork(branchName, parentStateBranch);
      if (isOk(forkResult)) {
        result.created.push({ type: 'slice', id: slice.id });
      } else {
        result.failed.push({ type: 'slice', id: slice.id, error: forkResult.error.message });
      }
    }
  }

  return Ok(result);
};
