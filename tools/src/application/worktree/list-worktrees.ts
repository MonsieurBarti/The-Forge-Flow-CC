import type { DomainError } from '../../domain/errors/domain-error.js';
import type { GitOps } from '../../domain/ports/git-ops.port.js';
import type { Result } from '../../domain/result.js';

interface ListWorktreesDeps {
  gitOps: GitOps;
}

export const listWorktreesUseCase = async (deps: ListWorktreesDeps): Promise<Result<string[], DomainError>> => {
  return deps.gitOps.listWorktrees();
};
