import { z } from "zod";
export declare const AutonomySettingsSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        guided: "guided";
        "plan-to-pr": "plan-to-pr";
    }>;
}, z.core.$strip>;
export type AutonomySettings = z.infer<typeof AutonomySettingsSchema>;
export declare function parseAutonomyMode(raw: unknown): "guided" | "plan-to-pr";
//# sourceMappingURL=autonomy-settings.d.ts.map