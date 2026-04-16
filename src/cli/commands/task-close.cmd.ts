import { isOk } from "../../domain/result.js";
import type { TaskCompletedEntry } from "../../domain/value-objects/journal-entry.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const taskCloseSchema: CommandSchema = {
	name: "task:close",
	purpose: "Close a completed task",
	requiredFlags: [
		{
			name: "task-id",
			type: "string",
			description: "Task ID to close",
			pattern: "^M\\d+-S\\d+-T\\d+$",
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
		"task:close --task-id T01",
		'task:close --task-id T01 --reason "Completed successfully"',
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

	const { taskStore, journalRepository } = createClosableStateStoresUnchecked();
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

	// Write task-completed entry to journal BEFORE closing (fail-fast)
	const journalEntry: Omit<TaskCompletedEntry, "seq"> = {
		type: "task-completed",
		sliceId: task.sliceId,
		taskId,
		waveIndex,
		durationMs,
		timestamp: new Date().toISOString(),
	};
	const journalResult = journalRepository.append(task.sliceId, journalEntry);
	if (!isOk(journalResult)) return JSON.stringify({ ok: false, error: journalResult.error });

	// Proceed with existing closeTask logic
	const result = taskStore.closeTask(taskId, reason);
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
