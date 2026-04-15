import { z } from "zod";
export const PatternSchema = z.object({
    sequence: z.array(z.string()).min(1),
    count: z.number().int().min(1),
    sessions: z.number().int().min(1),
    projects: z.number().int().min(1),
    lastSeen: z.string(),
});
//# sourceMappingURL=pattern.js.map