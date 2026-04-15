import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * Wraps a z.object schema so that `undefined` or `null` input is treated as `{}`
 * before parsing, enabling cascading field-level defaults.
 */
function withDefault<T extends z.ZodTypeAny>(schema: T) {
	return z.preprocess((val) => (val === undefined || val === null ? {} : val), schema);
}

const ModelProfileSchema = withDefault(
	z.object({
		model: z.string().catch("sonnet"),
	}),
);

const ModelProfilesSchema = withDefault(
	z.object({
		quality: z.preprocess(
			(val) => (val === undefined || val === null ? { model: "opus" } : val),
			ModelProfileSchema,
		),
		balanced: ModelProfileSchema,
		budget: ModelProfileSchema,
	}),
);

const AutonomySchema = withDefault(
	z.object({
		mode: z.enum(["guided", "plan-to-pr"]).catch("guided"),
		"max-retries": z.number().catch(2),
	}),
);

const AutoLearnWeightsSchema = withDefault(
	z.object({
		frequency: z.number().catch(0.25),
		breadth: z.number().catch(0.3),
		recency: z.number().catch(0.25),
		consistency: z.number().catch(0.2),
	}),
);

const AutoLearnGuardrailsSchema = withDefault(
	z.object({
		"min-corrections": z.number().catch(3),
		"cooldown-days": z.number().catch(7),
		"max-drift-pct": z.number().catch(20),
	}),
);

const AutoLearnClusteringSchema = withDefault(
	z.object({
		"min-sessions": z.number().catch(3),
		"min-patterns": z.number().catch(2),
		"jaccard-threshold": z.number().catch(0.3),
	}),
);

const AutoLearnSchema = withDefault(
	z.object({
		weights: AutoLearnWeightsSchema,
		guardrails: AutoLearnGuardrailsSchema,
		clustering: AutoLearnClusteringSchema,
	}),
);

const WorkflowSchema = withDefault(
	z.object({
		reminders: z.boolean().catch(true),
		guards: z.boolean().catch(true),
	}),
);

export const ProjectSettingsSchema = withDefault(
	z.object({
		"model-profiles": ModelProfilesSchema,
		autonomy: AutonomySchema,
		"auto-learn": AutoLearnSchema,
		workflow: WorkflowSchema,
	}),
);

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export function parseProjectSettings(raw: unknown): ProjectSettings {
	if (raw === undefined || raw === null || raw === "" || typeof raw !== "object") {
		return ProjectSettingsSchema.parse(undefined);
	}
	const result = ProjectSettingsSchema.safeParse(raw);
	if (result.success) return result.data;
	console.warn("[tff] settings parse failed, using defaults:", result.error.message);
	return ProjectSettingsSchema.parse(undefined);
}

/**
 * End-to-end: raw YAML string → parsed ProjectSettings.
 * Handles corrupted YAML, empty files, and all parse errors gracefully.
 */
export function loadProjectSettings(yamlContent: string): ProjectSettings {
	if (!yamlContent || !yamlContent.trim()) {
		return ProjectSettingsSchema.parse(undefined);
	}
	try {
		const parsed = parseYaml(yamlContent);
		return parseProjectSettings(parsed);
	} catch (err) {
		console.warn("[tff] failed to parse settings.yaml, using defaults:", String(err));
		return ProjectSettingsSchema.parse(undefined);
	}
}
