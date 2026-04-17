import { createSliceUseCase } from "../../application/slice/create-slice.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import { Err, isOk, Ok, type Result } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceCreateSchema: CommandSchema = {
	name: "slice:create",
	purpose: "Create a new slice in a milestone",
	requiredFlags: [
		{
			name: "title",
			type: "string",
			description: "Title for the new slice",
		},
	],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) — auto-detected if not provided",
		},
	],
	examples: [
		'slice:create --title "Implement feature X"',
		'slice:create --title "Fix bug Y" --milestone-id M01',
		'slice:create --title "Fix bug Y" --milestone-id <uuid>',
	],
};

/**
 * Resolve a milestone-id input (UUID or M-label) to a milestone UUID.
 *
 * Accepts:
 * - UUID v4 directly (passed through as-is)
 * - M-label like M01, M02, … (looks up by milestone.number)
 *
 * Returns Err with code NOT_FOUND if an M-label is given but no matching milestone exists.
 * Returns Err with code INVALID_INPUT for any other shape.
 */
function resolveMilestoneId(
	store: MilestoneStore,
	input: string,
): Result<string, { code: string; message: string }> {
	const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (UUID_V4_RE.test(input)) return Ok(input);

	const M_LABEL_RE = /^M(\d+)$/;
	const mMatch = M_LABEL_RE.exec(input);
	if (mMatch) {
		const number = parseInt(mMatch[1], 10);
		const listResult = store.listMilestones();
		if (!isOk(listResult)) return listResult;
		const found = listResult.data.find((m) => m.number === number);
		if (!found) {
			return Err({
				code: "NOT_FOUND",
				message: `Milestone "${input}" not found`,
			});
		}
		return Ok(found.id);
	}

	return Err({
		code: "INVALID_INPUT",
		message: `--milestone-id must be a UUID or M-label (e.g., M01): got "${input}"`,
	});
}

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { title, "milestone-id": explicitMilestoneId } = parsed.data as {
		title: string;
		"milestone-id"?: string;
	};

	const cwd = process.cwd();
	const { milestoneStore, sliceStore } = createClosableStateStoresUnchecked();
	const artifactStore = new MarkdownArtifactAdapter(cwd);
	const _gitOps = new GitCliAdapter(cwd);

	let milestoneId: string;

	if (explicitMilestoneId) {
		const resolved = resolveMilestoneId(milestoneStore, explicitMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}
		milestoneId = resolved.data;
	} else {
		// Auto-detect active milestone (most recent open one)
		const milestonesResult = milestoneStore.listMilestones();
		if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: "No milestone found. Run /tff:new-milestone first." },
			});
		}
		// Use the last open milestone, or the last one if none are open
		const openMilestones = milestonesResult.data.filter((m) => m.status !== "closed");
		const milestone =
			openMilestones.length > 0
				? openMilestones[openMilestones.length - 1]
				: milestonesResult.data[milestonesResult.data.length - 1];
		milestoneId = milestone.id;
	}

	const result = await createSliceUseCase(
		{ milestoneId, title: title },
		{ milestoneStore, sliceStore, artifactStore },
	);

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
