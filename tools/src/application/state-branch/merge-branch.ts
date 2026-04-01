import type { DomainError } from '../../domain/errors/domain-error.js';
import type { StateBranchPort } from '../../domain/ports/state-branch.port.js';
import { isOk, type Result } from '../../domain/result.js';
import type { MergeResult } from '../../domain/value-objects/merge-result.js';

interface MergeBranchInput { childCodeBranch: string; parentCodeBranch: string; sliceId: string; }
interface MergeBranchDeps { stateBranch: StateBranchPort; }

export const mergeBranchUseCase = async (
  input: MergeBranchInput,
  deps: MergeBranchDeps,
): Promise<Result<MergeResult, DomainError>> => {
  const mergeR = await deps.stateBranch.merge(
    input.childCodeBranch,
    input.parentCodeBranch,
    input.sliceId,
  );
  if (!isOk(mergeR)) return mergeR;

  await deps.stateBranch.deleteBranch(input.childCodeBranch);

  return mergeR;
};
