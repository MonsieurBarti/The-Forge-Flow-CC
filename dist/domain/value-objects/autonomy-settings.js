import { z } from "zod";
export const AutonomySettingsSchema = z.object({ mode: z.enum(["guided", "plan-to-pr"]) });
export function parseAutonomyMode(raw) {
    if (raw === "plan-to-pr")
        return "plan-to-pr";
    return "guided";
}
//# sourceMappingURL=autonomy-settings.js.map