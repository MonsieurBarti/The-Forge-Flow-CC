import { z } from "zod";
export declare const CandidateEvidenceSchema: z.ZodObject<{
    count: z.ZodNumber;
    sessions: z.ZodNumber;
    projects: z.ZodNumber;
}, z.core.$strip>;
export declare const CandidateSchema: z.ZodObject<{
    pattern: z.ZodArray<z.ZodString>;
    score: z.ZodNumber;
    evidence: z.ZodObject<{
        count: z.ZodNumber;
        sessions: z.ZodNumber;
        projects: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type CandidateEvidence = z.infer<typeof CandidateEvidenceSchema>;
//# sourceMappingURL=candidate.d.ts.map