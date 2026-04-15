import { z } from "zod";
export const ReviewTypeSchema = z.enum(["code", "security", "spec"]);
export const ReviewRecordSchema = z.object({
    sliceId: z.string().min(1),
    type: ReviewTypeSchema,
    reviewer: z.string().min(1),
    verdict: z.enum(["approved", "changes_requested"]),
    commitSha: z.string().min(1),
    notes: z.string().optional(),
    createdAt: z.string().min(1),
});
//# sourceMappingURL=review-record.js.map