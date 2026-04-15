import type { DomainError } from '../../domain/errors/domain-error.js';
import type { StateBranchPort } from '../../domain/ports/state-branch.port.js';
import type { Result } from '../../domain/result.js';

interface CreateRootBranchDeps {
  stateBranch: StateBranchPort;
}

export const createRootBranchUseCase = async (
  _input: Record<string, never>,
  deps: CreateRootBranchDeps,
): Promise<Result<void, DomainError>> => deps.stateBranch.createRoot();
