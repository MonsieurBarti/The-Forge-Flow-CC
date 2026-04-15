import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import type { Result } from "../../domain/result.js";
import type { ReviewType } from "../../domain/value-objects/review-record.js";
interface RecordReviewInput {
    sliceId: string;
    reviewer: string;
    verdict: "approved" | "changes_requested";
    type: ReviewType;
    commitSha: string;
    notes?: string;
}
interface RecordReviewDeps {
    reviewStore: ReviewStore;
}
export declare const recordReviewUseCase: (input: RecordReviewInput, deps: RecordReviewDeps) => Promise<Result<void, DomainError>>;
export {};
//# sourceMappingURL=record-review.d.ts.map