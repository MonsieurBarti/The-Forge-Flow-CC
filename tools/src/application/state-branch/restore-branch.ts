import type { DomainError } from '../../domain/errors/domain-error.js';
import type { StateBranchPort } from '../../domain/ports/state-branch.port.js';
import type { Result } from '../../domain/result.js';
import type { RestoreResult } from '../../domain/value-objects/restore-result.js';

interface RestoreBranchInput { codeBranch: string; targetDir: string; }
interface RestoreBranchDeps { stateBranch: StateBranchPort; }

export const restoreBranchUseCase = async (
  input: RestoreBranchInput,
  deps: RestoreBranchDeps,
): Promise<Result<RestoreResult | null, DomainError>> =>
  deps.stateBranch.restore(input.codeBranch, input.targetDir);
