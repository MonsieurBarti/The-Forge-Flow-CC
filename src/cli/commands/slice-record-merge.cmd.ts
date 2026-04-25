import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

const execFileP = promisify(execFile);

export const sliceRecordMergeSchema: CommandSchema = {
	name: "slice:record-merge",
	purpose:
		"Capture the merge commit + base ref for a slice's PR so the routing judge can find it later",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (M##-S##) or UUID",
		},
	],
	optionalFlags: [
		{
			name: "pr",
			type: "number",
			description: "PR number — calls `gh pr view <pr> --json mergeCommit,baseRefName`",
		},
		{
			name: "merge-sha",
			type: "string",
			description: "Explicit merge commit SHA (use with --base-ref; bypasses gh)",
		},
		{
			name: "base-ref",
			type: "string",
			description: "Explicit base branch (use with --merge-sha; bypasses gh)",
		},
	],
	examples: [
		"slice:record-merge --slice-id M01-S02 --pr 42",
		"slice:record-merge --slice-id M01-S02 --merge-sha abc1234 --base-ref milestone/x",
	],
};

export interface GhPrViewResult {
	mergeSha: string;
	baseRef: string;
}

export interface SliceRecordMergeOverrides {
	ghPrView?: (pr: number) => Promise<GhPrViewResult>;
}

const defaultGhPrView = async (pr: number): Promise<GhPrViewResult> => {
	const { stdout } = await execFileP(
		"gh",
		["pr", "view", String(pr), "--json", "mergeCommit,baseRefName"],
		{ cwd: process.cwd(), maxBuffer: 1024 * 1024 },
	);
	const parsed = JSON.parse(stdout) as {
		mergeCommit?: { oid?: string } | null;
		baseRefName?: string;
	};
	const mergeSha = parsed.mergeCommit?.oid;
	const baseRef = parsed.baseRefName;
	if (!mergeSha || !baseRef) {
		throw new Error(
			`gh pr view ${pr}: missing mergeCommit.oid or baseRefName (PR may not be merged yet)`,
		);
	}
	return { mergeSha, baseRef };
};

export const sliceRecordMergeCmd = async (
	args: string[],
	overrides: SliceRecordMergeOverrides = {},
): Promise<string> => {
	const parsed = parseFlags(args, sliceRecordMergeSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const flags = parsed.data as {
		"slice-id": string;
		pr?: number;
		"merge-sha"?: string;
		"base-ref"?: string;
	};

	const inlineProvided = flags["merge-sha"] != null && flags["base-ref"] != null;
	const inlinePartial = (flags["merge-sha"] != null) !== (flags["base-ref"] != null);
	if (inlinePartial) {
		return JSON.stringify({
			ok: false,
			error: preconditionViolationError([
				{
					code: "merge-sha+base-ref",
					expected: "both --merge-sha and --base-ref together",
					actual: "only one provided",
				},
			]),
		});
	}
	if (!inlineProvided && flags.pr == null) {
		return JSON.stringify({
			ok: false,
			error: preconditionViolationError([
				{
					code: "merge-source",
					expected: "--pr <n> or (--merge-sha + --base-ref)",
					actual: "neither provided",
				},
			]),
		});
	}

	let mergeSha: string;
	let baseRef: string;
	if (inlineProvided) {
		mergeSha = flags["merge-sha"] as string;
		baseRef = flags["base-ref"] as string;
	} else {
		const ghPrView = overrides.ghPrView ?? defaultGhPrView;
		try {
			const r = await ghPrView(flags.pr as number);
			mergeSha = r.mergeSha;
			baseRef = r.baseRef;
		} catch (err) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{
						code: "gh.pr.view",
						expected: "successful gh pr view with mergeCommit+baseRefName",
						actual: err instanceof Error ? err.message : String(err),
					},
				]),
			});
		}
	}

	const stores = createClosableStateStoresUnchecked();
	try {
		const resolvedRes = resolveSliceId(flags["slice-id"], stores.sliceStore);
		if (!resolvedRes.ok) return JSON.stringify({ ok: false, error: resolvedRes.error });
		const sliceId = resolvedRes.data;

		let businessError: DomainError | null = null;
		const txResult = await withTransaction(stores.db, () => {
			const r = stores.pendingJudgmentStore.recordMerge(sliceId, mergeSha, baseRef);
			if (!r.ok) businessError = r.error;
			return { data: null, tmpRenames: [] };
		});
		if (!txResult.ok) return JSON.stringify({ ok: false, error: txResult.error });
		if (businessError) return JSON.stringify({ ok: false, error: businessError });
		return JSON.stringify({
			ok: true,
			data: { slice_id: sliceId, merge_sha: mergeSha, base_ref: baseRef },
		});
	} finally {
		stores.close();
	}
};
