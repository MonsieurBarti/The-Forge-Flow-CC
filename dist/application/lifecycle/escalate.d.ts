import { z } from "zod";
export declare const EscalationSchema: z.ZodObject<{
    sliceId: z.ZodString;
    phase: z.ZodString;
    reason: z.ZodString;
    attempts: z.ZodNumber;
    lastError: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type Escalation = z.infer<typeof EscalationSchema>;
export declare function createEscalation(input: {
    sliceId: string;
    phase: string;
    reason: string;
    attempts: number;
    lastError?: string;
}): Escalation;
//# sourceMappingURL=escalate.d.ts.map