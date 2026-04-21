#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const thresholds = { lines: 80, functions: 80, branches: 69, statements: 80 };

const summaryPath = resolve(process.cwd(), "coverage/coverage-summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = summary.total;

const failures = [];
for (const [metric, threshold] of Object.entries(thresholds)) {
	const pct = total[metric]?.pct ?? 0;
	if (pct < threshold) failures.push(`${metric}: ${pct}% < ${threshold}%`);
}

if (failures.length > 0) {
	console.error("Coverage below threshold:");
	for (const f of failures) console.error(`  ${f}`);
	process.exit(1);
}

console.log(
	`Coverage ok: lines=${total.lines.pct}% functions=${total.functions.pct}% branches=${total.branches.pct}% statements=${total.statements.pct}%`,
);
