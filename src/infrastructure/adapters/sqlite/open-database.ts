// src/infrastructure/adapters/sqlite/open-database.ts
import Database from "better-sqlite3";
import { type BindingCandidate, getNativeBindingCandidates } from "./load-native-binding.js";
import { type NativeBindingCandidateFailure, NativeBindingError } from "./native-binding-error.js";

interface Trace {
	db: Database.Database;
	winningCandidate: BindingCandidate;
}

function tryOpen(
	dbPath: string,
	extraOpts: Database.Options | undefined,
	cand: BindingCandidate | undefined,
): Database.Database {
	if (!cand) return new Database(dbPath, extraOpts);
	return new Database(dbPath, { ...(extraOpts ?? {}), nativeBinding: cand.path });
}

/**
 * Same as {@link openDatabase} but returns the winning candidate alongside
 * the database handle for diagnostic surfaces (`version --verbose`).
 */
export function openDatabaseWithTrace(
	dbPath: string,
	extraOpts?: Database.Options,
	dirname?: string,
): Trace {
	const candidates = getNativeBindingCandidates(dirname);
	const failures: NativeBindingCandidateFailure[] = [];

	if (candidates.length === 0) {
		try {
			const db = tryOpen(dbPath, extraOpts, undefined);
			return { db, winningCandidate: { path: "<better-sqlite3 default>", source: "prebuilt" } };
		} catch (err) {
			throw new NativeBindingError({
				platform: process.platform,
				arch: process.arch,
				nodeAbi: process.versions.modules,
				candidates: [
					{
						path: "<better-sqlite3 default>",
						source: "prebuilt",
						reason: err instanceof Error ? err.message : String(err),
					},
				],
			});
		}
	}

	for (const cand of candidates) {
		try {
			const db = tryOpen(dbPath, extraOpts, cand);
			return { db, winningCandidate: cand };
		} catch (err) {
			failures.push({
				path: cand.path,
				source: cand.source,
				reason: err instanceof Error ? err.message : String(err),
			});
		}
	}

	throw new NativeBindingError({
		platform: process.platform,
		arch: process.arch,
		nodeAbi: process.versions.modules,
		candidates: failures,
	});
}

/**
 * Open a better-sqlite3 database, iterating through native-binding candidates
 * and throwing a structured {@link NativeBindingError} if every candidate fails.
 *
 * Note: any `nativeBinding` key passed in `extraOpts` is overridden by the
 * iterator's winning candidate. Callers that need a specific binding must
 * either co-locate the file where {@link getNativeBindingCandidates} expects
 * it, or construct `better-sqlite3` directly.
 */
export function openDatabase(
	dbPath: string,
	extraOpts?: Database.Options,
	dirname?: string,
): Database.Database {
	return openDatabaseWithTrace(dbPath, extraOpts, dirname).db;
}
