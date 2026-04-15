import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, isOk } from "../../domain/result.js";
import { loadCheckpoint } from "../checkpoint/load-checkpoint.js";
import { replayJournal } from "../journal/replay-journal.js";
/**
 * Resume slice execution after a crash by loading the checkpoint and replaying the journal.
 * This is the core T1 recovery logic - it determines where execution should continue.
 */
export const resumeSlice = async (input, deps) => {
    // Load the checkpoint for this slice
    const checkpointResult = await loadCheckpoint(input.sliceId, {
        artifactStore: deps.artifactStore,
    });
    if (!isOk(checkpointResult)) {
        // No checkpoint found means there's nothing to resume from
        return Err(createDomainError("NOT_FOUND", `No checkpoint found for slice "${input.sliceId}". Cannot resume without a checkpoint.`, { sliceId: input.sliceId, reason: "no-checkpoint" }));
    }
    const checkpoint = checkpointResult.data;
    // Replay the journal to determine what's been done
    const replayInput = {
        sliceId: input.sliceId,
        checkpoint: {
            completedTasks: checkpoint.completedTasks,
            currentWave: checkpoint.currentWave,
        },
    };
    const replayResult = replayJournal(replayInput, { journal: deps.journal });
    if (!isOk(replayResult)) {
        // Journal/checkpoint inconsistency detected during replay
        return Err(createDomainError("JOURNAL_REPLAY_INCONSISTENT", `Journal replay failed for slice "${input.sliceId}": ${replayResult.error.message}`, {
            sliceId: input.sliceId,
            reason: "replay-inconsistent",
            cause: replayResult.error.code,
            ...replayResult.error.context,
        }));
    }
    const replay = replayResult.data;
    // If inconsistent flag is set, treat this as an error
    if (!replay.consistent) {
        return Err(createDomainError("JOURNAL_REPLAY_INCONSISTENT", `Journal replay detected inconsistencies for slice "${input.sliceId}"`, { sliceId: input.sliceId, reason: "inconsistent-flag" }));
    }
    // Build the resume result
    // skipTasks = completedTaskIds from replay
    // nextTasks = tasks in the resume wave that aren't completed (to be determined by caller)
    const result = {
        resumeFromWave: replay.resumeFromWave,
        completedTaskIds: replay.completedTaskIds,
        skipTasks: replay.completedTaskIds,
        nextTasks: [], // Caller must populate based on slice plan
        consistent: replay.consistent,
        lastProcessedSeq: replay.lastProcessedSeq,
        checkpoint,
    };
    return { ok: true, data: result };
};
//# sourceMappingURL=resume-slice.js.map