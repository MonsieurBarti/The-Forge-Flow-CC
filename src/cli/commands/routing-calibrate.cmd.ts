import { createReadStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { calibrateUseCase } from "../../application/routing/calibrate.js";
import { isOk } from "../../domain/result.js";
import type { RoutingDecision } from "../../domain/value-objects/routing-decision.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { DebugJoinOutcomeSource } from "../../infrastructure/adapters/jsonl/debug-join-outcome-source.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import { renderCalibrationReport } from "../../infrastructure/adapters/markdown/calibration-report-renderer.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

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

async function loadDecisions(path: string): Promise<RoutingDecision[]> {
	try {
		await access(path);
	} catch {
		return [];
	}
	const out: RoutingDecision[] = [];
	const rl = createInterface({
		input: createReadStream(path, { encoding: "utf8" }),
		crlfDelay: Number.POSITIVE_INFINITY,
	});
	for await (const line of rl) {
		if (!line.trim()) continue;
		try {
			const entry = JSON.parse(line);
			if (entry.kind === "route" && entry.decision) out.push(entry.decision);
		} catch {}
	}
	return out;
}

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

	const routingPath = configRes.data.logging.path.startsWith("/")
		? configRes.data.logging.path
		: join(projectRoot, configRes.data.logging.path);
	const outcomesPath = join(dirname(routingPath), "routing-outcomes.jsonl");
	const reportPath = join(dirname(routingPath), "routing-calibration.md");

	// TODO(T17): read defaults from configRes.data.calibration once schema extended
	// Cast through unknown to avoid `as any` — T17 will add the typed field to RoutingConfig.
	const calibrationCfg = (
		configRes.data as unknown as { calibration?: { n_min?: number; implicit_weight?: number } }
	).calibration;
	const n_min = nMinFlag ?? calibrationCfg?.n_min ?? 5;
	const implicit_weight = weightFlag ?? calibrationCfg?.implicit_weight ?? 0.5;

	const decisions = await loadDecisions(routingPath);
	const implicitSource = new DebugJoinOutcomeSource(routingPath);
	const outcomesSource = new JsonlRoutingOutcomeReader(outcomesPath);
	const writer = new JsonlRoutingOutcomeWriter(outcomesPath);

	const report = await calibrateUseCase({
		decisions,
		implicitSource,
		outcomesSource,
		writer,
		config: { n_min, implicit_weight },
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
