import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { calibrateUseCase } from "../../application/routing/calibrate.js";
import { isOk } from "../../domain/result.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { DebugJoinOutcomeSource } from "../../infrastructure/adapters/jsonl/debug-join-outcome-source.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import { renderCalibrationReport } from "../../infrastructure/adapters/markdown/calibration-report-renderer.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

export const routingCalibrateSchema: CommandSchema = {
	name: "routing:calibrate",
	purpose: "Produce an advisory calibration report from routing decisions + outcomes",
	requiredFlags: [],
	optionalFlags: [
		{ name: "n-min", type: "number", description: "Minimum cell size (default 5)" },
		{
			name: "implicit-weight",
			type: "number",
			description: "Weight on debug-join outcomes (default 0.5)",
		},
	],
	examples: ["routing:calibrate", "routing:calibrate --n-min 3 --implicit-weight 0.3"],
};

export const routingCalibrateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingCalibrateSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { "n-min": nMinFlag, "implicit-weight": weightFlag } = parsed.data as {
		"n-min"?: number;
		"implicit-weight"?: number;
	};

	const projectRoot = process.cwd();
	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) return JSON.stringify({ ok: false, error: configRes.error });

	if (!configRes.data.enabled) {
		return JSON.stringify({
			ok: true,
			data: { skipped: true, reason: "routing_disabled" },
		});
	}

	const { routingPath, outcomesPath, reportPath } = resolveRoutingPaths(
		projectRoot,
		configRes.data.logging.path,
	);

	const n_min = nMinFlag ?? configRes.data.calibration?.n_min ?? 5;
	const implicitWeightFromSettings = configRes.data.calibration?.implicit_weight;
	const sourceWeightsFromSettings = configRes.data.calibration?.source_weights;
	// CLI flag override wins; if no flag, fall through to settings; if neither, leave undefined so calibrateUseCase defaults kick in.
	const implicit_weight = weightFlag ?? implicitWeightFromSettings;

	const decisionReader = new JsonlRoutingDecisionReader(routingPath);
	const decisions = await decisionReader.readDecisions();
	const implicitSource = new DebugJoinOutcomeSource(routingPath);
	const outcomesSource = new JsonlRoutingOutcomeReader(outcomesPath);
	const writer = new JsonlRoutingOutcomeWriter(outcomesPath);

	const report = await calibrateUseCase({
		decisions,
		implicitSource,
		outcomesSource,
		writer,
		config: {
			n_min,
			...(sourceWeightsFromSettings ? { source_weights: sourceWeightsFromSettings } : {}),
			...(implicit_weight !== undefined ? { implicit_weight } : {}),
		},
		now: () => new Date().toISOString(),
	});

	const md = renderCalibrationReport(report);
	await mkdir(dirname(reportPath), { recursive: true });
	await writeFile(reportPath, md, "utf8");

	return JSON.stringify({
		ok: true,
		data: {
			cells_evaluated: report.cells.length,
			recommendations_emitted: report.recommendations.length,
			report_path: reportPath,
		},
	});
};
