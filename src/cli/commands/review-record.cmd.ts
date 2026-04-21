import { recordReviewUseCase } from "../../application/review/record-review.js";
import { isOk } from "../../domain/result.js";
import { ReviewTypeSchema } from "../../domain/value-objects/review-record.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const reviewRecordSchema: CommandSchema = {
	name: "review:record",
	purpose: "Record a review for a slice",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "agent",
			type: "string",
			description: "Reviewer agent identity",
		},
		{
			name: "verdict",
			type: "string",
			description: "Review verdict",
			enum: ["approved", "changes_requested"],
		},
		{
			name: "type",
			type: "string",
			description: "Review type",
			enum: ["code", "security", "spec"],
		},
		{
			name: "commit-sha",
			type: "string",
			description: "Commit SHA being reviewed",
		},
	],
	optionalFlags: [],
	examples: [
		"review:record --slice-id M01-S01 --agent reviewer --verdict approved --type code --commit-sha abc123",
	],
};

export const reviewRecordCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, reviewRecordSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		"slice-id": sliceId,
		agent,
		verdict,
		type,
		"commit-sha": commitSha,
	} = parsed.data as {
		"slice-id": string;
		agent: string;
		verdict: string;
		type: string;
		"commit-sha": string;
	};

	const parsedType = ReviewTypeSchema.safeParse(type);
	if (!parsedType.success) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_ARGS",
				message: `Invalid type "${type}". Must be: code, security, spec`,
			},
		});
	}

	const { reviewStore, sliceStore } = createClosableStateStoresUnchecked();
	const resolved = resolveSliceId(sliceId, sliceStore);
	if (!resolved.ok) return JSON.stringify({ ok: false, error: resolved.error });

	const result = await recordReviewUseCase(
		{
			sliceId: resolved.data,
			reviewer: agent,
			verdict: verdict as "approved" | "changes_requested",
			type: parsedType.data,
			commitSha,
		},
		{ reviewStore },
	);
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
