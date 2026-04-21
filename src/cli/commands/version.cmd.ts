// src/cli/commands/version.cmd.ts
import { join } from "node:path";
import { readRecoveryMarker } from "../../application/recovery/recovery-marker.js";
import { openDatabaseWithTrace } from "../../infrastructure/adapters/sqlite/open-database.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const versionSchema: CommandSchema = {
	name: "version",
	purpose:
		"Print the tff-tools version. With --verbose, include binding source, Node ABI, platform, arch, and last-recovery status as JSON.",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "verbose",
			type: "boolean",
			description: "Include diagnostic fields (binding, nodeAbi, platform, arch, lastRecovery)",
		},
	],
	examples: ["version", "version --verbose"],
};

interface BindingReport {
	path: string;
	source: "prebuilt" | "local";
}

interface LastRecoveryOk {
	status: "ok";
}

interface LastRecoverySkipped {
	status: "skipped";
	timestamp: string;
	errorMessage: string;
}

type LastRecovery = LastRecoveryOk | LastRecoverySkipped;

export const versionCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, versionSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { verbose } = parsed.data as { verbose?: boolean };
	const version = typeof __TFF_VERSION__ !== "undefined" ? __TFF_VERSION__ : "0.0.0-dev";

	if (!verbose) {
		return JSON.stringify({ ok: true, data: { version } });
	}

	let binding: BindingReport | null = null;
	try {
		const traced = openDatabaseWithTrace(":memory:");
		binding = {
			path: traced.winningCandidate.path,
			source: traced.winningCandidate.source,
		};
		traced.db.close();
	} catch {
		// Version surface must not fail on binding failure. NativeBindingError is
		// handled elsewhere for real commands; any other throw also degrades to
		// binding: null so `--version --verbose` stays observable.
		binding = null;
	}

	const home = join(process.cwd(), ".tff-cc");
	const marker = await readRecoveryMarker(home);
	const lastRecovery: LastRecovery = marker
		? {
				status: "skipped",
				timestamp: marker.timestamp,
				errorMessage: marker.errorMessage,
			}
		: { status: "ok" };

	return JSON.stringify({
		ok: true,
		data: {
			version,
			binding,
			nodeAbi: process.versions.modules,
			node: process.version,
			platform: process.platform,
			arch: process.arch,
			lastRecovery,
		},
	});
};
