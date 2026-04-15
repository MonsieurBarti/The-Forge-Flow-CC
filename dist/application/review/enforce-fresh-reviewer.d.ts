import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { type Result } from "../../domain/result.js";
interface EnforceFreshReviewerInput {
    sliceId: string;
    reviewerAgent: string;
}
interface EnforceFreshReviewerDeps {
    taskStore: TaskStore;
    reviewStore: ReviewStore;
}
export declare const enforceFreshReviewer: (input: EnforceFreshReviewerInput, deps: EnforceFreshReviewerDeps) => Promise<Result<void, DomainError>>;
export {};
//# sourceMappingURL=enforce-fresh-reviewer.d.ts.map