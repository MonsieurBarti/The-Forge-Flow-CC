import {
	auditDeadLetter,
	checkFirstObservationSentinel,
	checkLastObservation,
} from "../../application/observations/health-checks.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

const STALE_AFTER_DAYS = 14;

export const observeHealthSchema: CommandSchema = {
	name: "observe:health",
	purpose: "Check observation liveness (last-obs, first-obs sentinel, dead-letter)",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["observe:health"],
};

export const observeHealthCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, observeHealthSchema);
	if (!parsed.ok) return JSON.stringify(parsed);

	const root = process.cwd();
	const now = new Date();

	const data = {
		lastObservation: checkLastObservation(root, now, STALE_AFTER_DAYS),
		firstObservationSentinel: checkFirstObservationSentinel(root),
		deadLetter: auditDeadLetter(root),
	};

	return JSON.stringify({ ok: true, data });
};
