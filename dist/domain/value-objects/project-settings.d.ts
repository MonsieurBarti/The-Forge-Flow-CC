import { z } from "zod";
export declare const ProjectSettingsSchema: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
    "model-profiles": z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
        quality: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            model: z.ZodCatch<z.ZodString>;
        }, z.core.$strip>>>;
        balanced: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            model: z.ZodCatch<z.ZodString>;
        }, z.core.$strip>>;
        budget: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            model: z.ZodCatch<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    autonomy: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
        mode: z.ZodCatch<z.ZodEnum<{
            guided: "guided";
            "plan-to-pr": "plan-to-pr";
        }>>;
        "max-retries": z.ZodCatch<z.ZodNumber>;
    }, z.core.$strip>>;
    "auto-learn": z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
        weights: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            frequency: z.ZodCatch<z.ZodNumber>;
            breadth: z.ZodCatch<z.ZodNumber>;
            recency: z.ZodCatch<z.ZodNumber>;
            consistency: z.ZodCatch<z.ZodNumber>;
        }, z.core.$strip>>;
        guardrails: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            "min-corrections": z.ZodCatch<z.ZodNumber>;
            "cooldown-days": z.ZodCatch<z.ZodNumber>;
            "max-drift-pct": z.ZodCatch<z.ZodNumber>;
        }, z.core.$strip>>;
        clustering: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
            "min-sessions": z.ZodCatch<z.ZodNumber>;
            "min-patterns": z.ZodCatch<z.ZodNumber>;
            "jaccard-threshold": z.ZodCatch<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    workflow: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodObject<{
        reminders: z.ZodCatch<z.ZodBoolean>;
        guards: z.ZodCatch<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export declare function parseProjectSettings(raw: unknown): ProjectSettings;
/**
 * End-to-end: raw YAML string → parsed ProjectSettings.
 * Handles corrupted YAML, empty files, and all parse errors gracefully.
 */
export declare function loadProjectSettings(yamlContent: string): ProjectSettings;
//# sourceMappingURL=project-settings.d.ts.map