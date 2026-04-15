import { z } from "zod";
export const RestoreResultSchema = z.object({
    filesRestored: z.number().int().nonnegative(),
    schemaVersion: z.number().int().nonnegative(),
    source: z.enum(["json", "files"]).optional(),
});
//# sourceMappingURL=restore-result.js.map