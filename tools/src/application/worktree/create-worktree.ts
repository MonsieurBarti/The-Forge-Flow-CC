import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

interface CreateWorktreeInput { sliceId: string; }
interface CreateWorktreeDeps { gitOps: GitOps; }
interface CreateWorktreeOutput { worktreePath: string; branchName: string; }

export const createWorktreeUseCase = async (
  input: CreateWorktreeInput,
  deps: CreateWorktreeDeps,
): Promise<Result<CreateWorktreeOutput, DomainError>> => {
  const worktreePath = `.tff/worktrees/${input.sliceId}`;
  const branchName = `slice/${input.sliceId}`;

  const result = await deps.gitOps.createWorktree(worktreePath, branchName);
  if (!isOk(result)) return result;

  return Ok({ worktreePath, branchName });
};
