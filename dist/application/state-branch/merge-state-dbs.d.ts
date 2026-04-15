import type { DomainError } from "../../domain/errors/domain-error.js";
import { type Result } from "../../domain/result.js";
import type { MergeResult } from "../../domain/value-objects/merge-result.js";
/**
 * Entity-level SQL merge via ATTACH.
 * Child's owned entities (slice + tasks + deps for sliceId) win.
 * Parent's other entities stay untouched.
 */
export declare function mergeStateDbs(parentDbPath: string, childDbPath: string, sliceId: string): Result<MergeResult, DomainError>;
//# sourceMappingURL=merge-state-dbs.d.ts.map