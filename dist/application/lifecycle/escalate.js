import { z } from "zod";
export const EscalationSchema = z.object({
    sliceId: z.string().min(1),
    phase: z.string().min(1),
    reason: z.string().min(1),
    attempts: z.number().int().min(0),
    lastError: z.string().optional(),
    createdAt: z.string(),
});
export function createEscalation(input) {
    return { ...input, createdAt: new Date().toISOString() };
}
//# sourceMappingURL=escalate.js.map