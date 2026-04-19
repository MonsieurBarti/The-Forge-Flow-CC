import { dirname, isAbsolute, join } from "node:path";

export interface RoutingPaths {
	routingPath: string;
	outcomesPath: string;
	reportPath: string;
}

export const resolveRoutingPaths = (projectRoot: string, loggingPath: string): RoutingPaths => {
	const routingPath = isAbsolute(loggingPath) ? loggingPath : join(projectRoot, loggingPath);
	const logsDir = dirname(routingPath);
	return {
		routingPath,
		outcomesPath: join(logsDir, "routing-outcomes.jsonl"),
		reportPath: join(logsDir, "routing-calibration.md"),
	};
};
