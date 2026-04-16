import {
	classifyDifficulty,
	type DifficultySignals,
	difficultyToProfile,
} from "../../application/classification/difficulty-classifier.js";
import { detectWaves } from "../../application/waves/detect-waves.js";
import { isOk } from "../../domain/result.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const wavesDetectSchema: CommandSchema = {
	name: "waves:detect",
	purpose: "Detect execution waves from task dependencies",
	requiredFlags: [
		{
			name: "tasks",
			type: "json",
			description: "JSON array of tasks with id and dependsOn fields",
		},
	],
	optionalFlags: [
		{
			name: "classify",
			type: "boolean",
			description: "Classify task difficulty and map to model profile",
		},
		{
			name: "slice-tier",
			type: "string",
			description: "Slice complexity tier (S, F-lite, F-full) for classification",
			enum: ["S", "F-lite", "F-full"],
		},
	],
	examples: [
		'waves:detect --tasks \'[{"id":"T01","dependsOn":[]},{"id":"T02","dependsOn":["T01"]}]\'',
		"waves:detect --tasks '[...]' --classify --slice-tier S",
	],
};

export const wavesDetectCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, wavesDetectSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		tasks,
		classify,
		"slice-tier": sliceTier,
	} = parsed.data as {
		tasks: unknown;
		classify?: boolean;
		"slice-tier"?: string;
	};

	if (
		!Array.isArray(tasks) ||
		!tasks.every((t) => typeof t?.id === "string" && Array.isArray(t?.dependsOn))
	) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_ARGS",
				message: "Each task must have { id: string, dependsOn: string[] }",
			},
		});
	}

	const result = detectWaves(tasks);
	if (!isOk(result)) return JSON.stringify({ ok: false, error: result.error });

	// If --classify flag is set, compute difficulty and profile for each task
	if (classify) {
		const tier = (sliceTier as "S" | "F-lite" | "F-full") || "S";
		const maxWave = result.data.length - 1;

		const classifiedTasks = tasks.map((task) => {
			const taskWithDeps = task as {
				id: string;
				dependsOn: string[];
				files?: number;
				keywords?: string[];
				hasDeps?: boolean;
				isDep?: boolean;
				waveDepth?: number;
			};

			// Find which wave this task belongs to
			const waveDepth = result.data.findIndex((w) => w.taskIds.includes(taskWithDeps.id));

			const signals: DifficultySignals = {
				fileCount: taskWithDeps.files ?? 1,
				filesTouched: taskWithDeps.files ?? 1,
				keywords: taskWithDeps.keywords ?? [],
				hasDeps: taskWithDeps.hasDeps ?? taskWithDeps.dependsOn.length > 0,
				isDep: taskWithDeps.isDep ?? false,
				waveDepth: taskWithDeps.waveDepth ?? waveDepth,
				maxWave: maxWave,
				sliceTier: tier,
			};

			const difficulty = classifyDifficulty(signals);
			const profile = difficultyToProfile(difficulty);

			return {
				id: taskWithDeps.id,
				difficulty,
				profile,
			};
		});

		return JSON.stringify({
			ok: true,
			data: {
				waves: result.data,
				tasks: classifiedTasks,
			},
		});
	}

	return JSON.stringify({ ok: true, data: result.data });
};
