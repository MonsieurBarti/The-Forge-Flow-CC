import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { restoreBranchUseCase } from "../../application/state-branch/restore-branch.js";
import { isOk } from "../../domain/result.js";
import { BranchMetaSchema } from "../../domain/value-objects/branch-meta.js";
import { SQLiteStateImporter } from "../../infrastructure/adapters/export/sqlite-state-importer.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
import { SQLiteStateAdapter } from "../../infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import {
	readLocalStamp,
	writeLocalStamp,
	writeSyntheticStamp,
} from "../../infrastructure/hooks/branch-meta-stamp.js";
import { acquireRestoreLock } from "../../infrastructure/locking/tff-lock.js";

export const hookPostCheckoutCmd = async (args: string[]): Promise<string> => {
	const [codeBranch] = args;
	if (!codeBranch) {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: "Usage: hook:post-checkout <branch>" },
		});
	}

	const cwd = process.cwd();
	const tffDir = path.join(cwd, ".tff");
	const dbPath = path.join(tffDir, "state.db");

	try {
		const gitOps = new GitCliAdapter(cwd);

		// S02: Create SQLiteStateImporter for JSON-based state restoration
		// Ensure DB directory exists and schema is initialized
		mkdirSync(tffDir, { recursive: true });
		const sqliteAdapter = SQLiteStateAdapter.create(dbPath);
		const initR = sqliteAdapter.init();
		if (!isOk(initR)) {
			return JSON.stringify({
				ok: true,
				data: { action: "error", reason: `Failed to init DB: ${initR.error.message}` },
			});
		}
		const importer = new SQLiteStateImporter(sqliteAdapter);

		const stateBranch = new GitStateBranchAdapter(gitOps, cwd, undefined, importer);

		// 1. Fetch state branch from remote (best-effort — works on fresh clones, no-ops if offline)
		await gitOps.fetchBranch(`tff-state/${codeBranch}`).catch(() => undefined);

		// 2. Check if state branch exists locally (may have just been fetched above)
		const existsResult = await stateBranch.exists(codeBranch);
		if (!isOk(existsResult) || !existsResult.data) {
			return JSON.stringify({
				ok: true,
				data: { action: "skipped", reason: `No state branch for "${codeBranch}"` },
			});
		}

		// 2. Check if stamp already matches
		const stamp = readLocalStamp(tffDir);
		if (stamp && stamp.codeBranch === codeBranch) {
			return JSON.stringify({
				ok: true,
				data: { action: "skipped", reason: "Stamp already matches current branch" },
			});
		}

		// 3. Acquire exclusive lock (timeout 5s)
		let release: (() => Promise<void>) | null = null;
		if (existsSync(dbPath)) {
			release = await acquireRestoreLock(dbPath, 5000);
			if (!release) {
				return JSON.stringify({
					ok: true,
					data: { action: "skipped", reason: "Lock held by another process" },
				});
			}
		}

		try {
			// 4. Restore
			const result = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

			// Close the database connection after restore to ensure data is flushed
			sqliteAdapter.close();

			if (!isOk(result) || result.data === null) {
				writeSyntheticStamp(tffDir, codeBranch);
				return JSON.stringify({
					ok: true,
					data: { action: "skipped", reason: "Restore returned null" },
				});
			}

			// 5. Write stamp — extract stateId from branch-meta.json in git (not disk, to avoid leaking root-level artifacts)
			const metaBufR = await gitOps.extractFile(`tff-state/${codeBranch}`, "branch-meta.json");
			if (isOk(metaBufR)) {
				try {
					const raw = JSON.parse(metaBufR.data.toString("utf8"));
					const meta = BranchMetaSchema.parse(raw);
					writeLocalStamp(tffDir, {
						stateId: meta.stateId,
						codeBranch,
						parentStateBranch: meta.parentStateBranch,
						createdAt: meta.createdAt,
					});
				} catch {
					writeSyntheticStamp(tffDir, codeBranch);
				}
			} else {
				writeSyntheticStamp(tffDir, codeBranch);
			}

			return JSON.stringify({
				ok: true,
				data: { action: "restored", filesRestored: result.data.filesRestored },
			});
		} finally {
			if (release) await release();
		}
	} catch (e) {
		// Hook should never fail — always return ok
		return JSON.stringify({
			ok: true,
			data: { action: "error", reason: String(e) },
		});
	}
};
