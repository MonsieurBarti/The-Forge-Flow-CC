import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { isOk } from "../../domain/result.js";
import type { TaskStartedEntry } from "../../domain/value-objects/journal-entry.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const taskClaimSchema: CommandSchema = {
	name: "task:claim",
	purpose: "Claim a task for execution",
	mutates: true,
	requiredFlags: [
		{
			name: "task-id",
			type: "string",
			description: "Task ID to claim",
			pattern: "^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|M\\d+-S\\d+)-T\\d+$",
		},
	],
	optionalFlags: [
		{
			name: "claimed-by",
			type: "string",
			description: "Agent identity claiming the task",
		},
	],
	examples: [
		"task:claim --task-id M01-S01-T01",
		"task:claim --task-id 12345678-abcd-ef01-2345-67890abcdef0-T01 --claimed-by executor",
	],
};

export const taskClaimCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, taskClaimSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "task-id": taskId, "claimed-by": claimedBy } = parsed.data as {
		"task-id": string;
		"claimed-by"?: string;
	};

	const closableStores = createClosableStateStoresUnchecked();
	const { db, taskStore, journalRepository } = closableStores;
	// Read task to get wave index and sliceId for journal entry
	const taskResult = taskStore.getTask(taskId);
	if (!isOk(taskResult)) return JSON.stringify({ ok: false, error: taskResult.error });
	if (!taskResult.data)
		return JSON.stringify({
			ok: false,
			error: { code: "TASK_NOT_FOUND", message: `Task ${taskId} not found` },
		});

	const task = taskResult.data;
	const waveIndex = task.wave ?? 0;
	const agentIdentity = claimedBy ?? "anonymous";

	// Build the task-started journal entry (appended AFTER the DB tx commits).
	const journalEntry: Omit<TaskStartedEntry, "seq"> = {
		type: "task-started",
		sliceId: task.sliceId,
		taskId,
		waveIndex,
		agentIdentity,
		timestamp: new Date().toISOString(),
	};

	// Run the idempotent DB UPDATE inside a transaction. If ALREADY_CLAIMED,
	// no rows were changed and no journal entry should be written — we
	// capture the error outcome via a sentinel rather than throwing (nothing
	// to rollback) so the public error code is preserved.
	let businessError: DomainError | null = null;
	const txResult = await withTransaction(db, () => {
		const r = taskStore.claimTask(taskId, claimedBy);
		if (!r.ok) {
			businessError = r.error;
		}
		return { data: null, tmpRenames: [] };
	});

	if (!txResult.ok) {
		return JSON.stringify({ ok: false, error: txResult.error });
	}
	if (businessError) {
		return JSON.stringify({ ok: false, error: businessError });
	}

	// DB claim is durable. Append the journal entry AFTER commit.
	// Journal-append failure is a PartialSuccessWarning: the claim succeeded
	// but the audit trail is incomplete (retryable).
	const warnings: DomainError[] = [...txResult.warnings];
	const journalResult = journalRepository.append(task.sliceId, journalEntry);
	if (!isOk(journalResult)) {
		warnings.push(
			partialSuccessWarning(`journal append failed: ${journalResult.error.message}`, "journal"),
		);
	}

	return JSON.stringify({ ok: true, data: null, warnings });
};
