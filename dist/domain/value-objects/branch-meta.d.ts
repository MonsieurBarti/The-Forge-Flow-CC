import { z } from "zod";
export declare const BranchMetaSchema: z.ZodObject<{
    stateId: z.ZodString;
    codeBranch: z.ZodString;
    parentStateBranch: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    restoredAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BranchMeta = z.infer<typeof BranchMetaSchema>;
//# sourceMappingURL=branch-meta.d.ts.map