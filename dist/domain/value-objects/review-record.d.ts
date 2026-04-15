import { z } from "zod";
export declare const ReviewTypeSchema: z.ZodEnum<{
    code: "code";
    spec: "spec";
    security: "security";
}>;
export type ReviewType = z.infer<typeof ReviewTypeSchema>;
export declare const ReviewRecordSchema: z.ZodObject<{
    sliceId: z.ZodString;
    type: z.ZodEnum<{
        code: "code";
        spec: "spec";
        security: "security";
    }>;
    reviewer: z.ZodString;
    verdict: z.ZodEnum<{
        approved: "approved";
        changes_requested: "changes_requested";
    }>;
    commitSha: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;
//# sourceMappingURL=review-record.d.ts.map