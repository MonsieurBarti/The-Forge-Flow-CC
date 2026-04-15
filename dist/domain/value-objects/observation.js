import { z } from "zod";
export const ObservationSchema = z.object({
    ts: z.string(),
    session: z.string(),
    tool: z.string().min(1),
    args: z.string().nullable(),
    project: z.string(),
});
//# sourceMappingURL=observation.js.map