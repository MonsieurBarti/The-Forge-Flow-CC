import { z } from "zod";
export declare const CommitRefSchema: z.ZodObject<{
    sha: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type CommitRef = z.infer<typeof CommitRefSchema>;
//# sourceMappingURL=commit-ref.d.ts.map