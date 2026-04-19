import type {
	CalibrationCell,
	CalibrationRecommendation,
	CalibrationReport,
	SkippedCell,
} from "../../../domain/value-objects/calibration-report.js";

const header = (r: CalibrationReport) =>
	[
		"# Routing Calibration Report",
		"",
		`Generated at: ${r.generated_at}`,
		`N_min: ${r.n_min}`,
		`Implicit weight: ${r.implicit_weight}`,
		`Decisions scanned: ${r.decisions_scanned}`,
		`Outcomes scanned: ${r.outcomes_scanned}`,
		"",
	].join("\n");

const cellRow = (c: CalibrationCell): string => {
	const b = c.verdict_breakdown;
	return `| ${c.key.value} | ${c.total} | ${c.effective_total.toFixed(2)} | ${c.effective_wrong.toFixed(2)} | ok:${b.ok} wrong:${b.wrong} too-low:${b.too_low} too-high:${b.too_high} |`;
};

const tableOr = (heading: string, cells: CalibrationCell[], emptyMsg: string): string => {
	if (cells.length === 0) return `## ${heading}\n\n${emptyMsg}\n`;
	return [
		`## ${heading}`,
		"",
		"| key | total | effective_total | effective_wrong | breakdown |",
		"|---|---|---|---|---|",
		...cells.map(cellRow),
		"",
	].join("\n");
};

const recsSection = (recs: CalibrationRecommendation[]): string => {
	if (recs.length === 0) return "## Recommendations\n\nNo recommendations.\n";
	return [
		"## Recommendations",
		"",
		...recs.map(
			(r) =>
				`- **${r.rule_id}** (${r.severity}) — ${r.cell_key.kind}:${r.cell_key.value}: ${r.message}`,
		),
		"",
	].join("\n");
};

const skippedSection = (skipped: SkippedCell[]): string => {
	if (skipped.length === 0) return "";
	return [
		"## Skipped cells",
		"",
		...skipped.map((s) => `- ${s.key.kind}:${s.key.value} (N=${s.total}) — ${s.reason}`),
		"",
	].join("\n");
};

export const renderCalibrationReport = (report: CalibrationReport): string => {
	const byAgent = report.cells.filter((c) => c.key.kind === "agent");
	const byTag = report.cells.filter((c) => c.key.kind === "tag");

	const emptySummary = report.cells.length === 0 ? "No cells evaluated.\n\n" : "";

	return [
		header(report),
		emptySummary,
		tableOr("Per-agent", byAgent, "No per-agent cells."),
		tableOr("Per-tag", byTag, "No per-tag cells."),
		recsSection(report.recommendations),
		skippedSection(report.skipped_cells),
	].join("\n");
};
