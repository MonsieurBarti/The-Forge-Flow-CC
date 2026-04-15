import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, Ok } from "../../domain/result.js";
export const replayJournal = (input, deps) => {
    const readResult = deps.journal.readAll(input.sliceId);
    if (!readResult.ok) {
        return Err(createDomainError("JOURNAL_REPLAY_INCONSISTENT", readResult.error.message));
    }
    const entries = readResult.data;
    // Empty journal + non-empty checkpoint → reject
    if (entries.length === 0 && input.checkpoint.completedTasks.length > 0) {
        return Err(createDomainError("JOURNAL_REPLAY_INCONSISTENT", "Journal is empty but checkpoint has completed tasks", {
            reason: "empty-journal-nonempty-checkpoint",
        }));
    }
    const completedTaskIds = new Set();
    let highestWave = -1;
    let lastProcessedSeq = -1;
    for (const entry of entries) {
        lastProcessedSeq = entry.seq;
        if (entry.type === "task-completed")
            completedTaskIds.add(entry.taskId);
        if (entry.type === "checkpoint-saved")
            highestWave = Math.max(highestWave, entry.waveIndex);
    }
    // Cross-validate: every task the checkpoint claims must exist in journal
    for (const taskId of input.checkpoint.completedTasks) {
        if (!completedTaskIds.has(taskId)) {
            return Err(createDomainError("JOURNAL_REPLAY_INCONSISTENT", `Checkpoint claims task ${taskId} completed but no journal entry found`, { reason: "missing-task-completed", taskId }));
        }
    }
    // Determine resume wave
    let resumeFromWave;
    if (entries.length === 0) {
        resumeFromWave = 0;
    }
    else if (highestWave >= 0) {
        resumeFromWave = Math.max(highestWave + 1, input.checkpoint.currentWave);
    }
    else {
        resumeFromWave = input.checkpoint.currentWave;
    }
    return Ok({
        resumeFromWave,
        completedTaskIds: [...completedTaskIds],
        lastProcessedSeq,
        consistent: true,
    });
};
//# sourceMappingURL=replay-journal.js.map