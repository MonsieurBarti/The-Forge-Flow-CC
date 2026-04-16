import { isOk } from "../../domain/result.js";
import type { TaskStartedEntry } from "../../domain/value-objects/journal-entry.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const taskClaimSchema: CommandSchema = {
	name: "task:claim",
	purpose: "Claim a task for execution",
	requiredFlags: [
		{
			name: "task-id",
			type: "string",
			description: "Task ID to claim",
			pattern: "^M\\d+-S\\d+-T\\d+$",
		},
	],
	optionalFlags: [
		{
			name: "claimed-by",
			type: "string",
			description: "Agent identity claiming the task",
		},
	],
	examples: ["task:claim --task-id T01", "task:claim --task-id T01 --claimed-by executor"],
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
	const agentIdentity = claimedBy ?? "anonymous";

	// Write task-started entry to journal BEFORE claiming (fail-fast)
	const journalEntry: Omit<TaskStartedEntry, "seq"> = {
		type: "task-started",
		sliceId: task.sliceId,
		taskId,
		waveIndex,
		agentIdentity,
		timestamp: new Date().toISOString(),
	};
	const journalResult = journalRepository.append(task.sliceId, journalEntry);
	if (!isOk(journalResult)) return JSON.stringify({ ok: false, error: journalResult.error });

	// Proceed with existing claimTask logic
	const result = taskStore.claimTask(taskId, claimedBy);
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
