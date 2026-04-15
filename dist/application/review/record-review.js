export const recordReviewUseCase = async (input, deps) => {
    return deps.reviewStore.recordReview({
        sliceId: input.sliceId,
        reviewer: input.reviewer,
        verdict: input.verdict,
        type: input.type,
        commitSha: input.commitSha,
        notes: input.notes,
        createdAt: new Date().toISOString(),
    });
};
//# sourceMappingURL=record-review.js.map