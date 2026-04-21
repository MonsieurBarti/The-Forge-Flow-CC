import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { isOk } from "../../domain/result.js";
import type { TaskCompletedEntry } from "../../domain/value-objects/journal-entry.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const taskCloseSchema: CommandSchema = {
	name: "task:close",
	purpose: "Close a completed task",
	mutates: true,
	requiredFlags: [
		{
			name: "task-id",
			type: "string",
			description: "Task ID to close",
			pattern: "^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|M\\d+-S\\d+)-T\\d+$",
		},
	],
	optionalFlags: [
		{
			name: "reason",
			type: "string",
			description: "Reason for closing",
		},
	],
	examples: [
		"task:close --task-id M01-S01-T01",
		'task:close --task-id 12345678-abcd-ef01-2345-67890abcdef0-T01 --reason "Completed successfully"',
	],
};

export const taskCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, taskCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "task-id": taskId, reason } = parsed.data as {
		"task-id": string;
		reason?: string;
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

	// Calculate duration (for now use estimate of 0 since we don't track actual duration yet)
	const durationMs = 0;

	// Build the task-completed journal entry (appended AFTER the DB tx commits).
	const journalEntry: Omit<TaskCompletedEntry, "seq"> = {
		type: "task-completed",
		sliceId: task.sliceId,
		taskId,
		waveIndex,
		durationMs,
		timestamp: new Date().toISOString(),
	};

	// Run the DB UPDATE inside a transaction. Business errors surface via a
	// sentinel rather than a throw so public error codes are preserved.
	let businessError: DomainError | null = null;
	const txResult = await withTransaction(db, () => {
		const r = taskStore.closeTask(taskId, reason);
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

	// DB close is durable. Append the journal entry AFTER commit.
	// Journal-append failure is a PartialSuccessWarning: the close succeeded
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
