import { detectWavesFromStores } from "../waves/detect-waves.js";
/**
 * Determine the current wave position based on task statuses.
 * Current wave is the first wave that has at least one non-completed task.
 */
function determineCurrentWave(tasks, waves) {
    if (waves.length === 0)
        return 0;
    for (const wave of waves) {
        const waveTasks = tasks.filter((t) => wave.taskIds.includes(t.id));
        const hasIncompleteTask = waveTasks.some((t) => t.status !== "closed");
        if (hasIncompleteTask) {
            return wave.index + 1; // 1-based for display
        }
    }
    // All waves complete - return last wave
    return waves.length;
}
/**
 * Get the next recommended commands based on the current phase.
 */
function getNextCommands(phase) {
    switch (phase) {
        case "executing":
            return "/tff:execute or /tff:pause";
        case "researching":
            return "/tff:plan";
        case "planning":
            return "/tff:research or /tff:start";
        case "paused":
            return "/tff:resume or /tff:stop";
        case "transitioning":
            return "/tff:next or /tff:back";
        case "reviewing":
            return "/tff:complete or /tff:reject";
        default:
            return "/tff:status";
    }
}
/**
 * Generate a compact reminder string for the current session state.
 * Returns null if no active session exists.
 */
export function generateReminder(deps) {
    const sessionResult = deps.sessionStore.getSession();
    if (!sessionResult.ok)
        return null;
    const session = sessionResult.data;
    if (!session || !session.activeSliceId || !session.activeMilestoneId)
        return null;
    const phase = session.phase;
    const sliceId = session.activeSliceId;
    const milestoneId = session.activeMilestoneId;
    // Get tasks for the active slice
    const tasksResult = deps.taskStore.listTasks(sliceId);
    if (!tasksResult.ok) {
        // Fall back to phase-only reminder
        return `\`\`\`\n${milestoneId}-${sliceId}: ${phase}\n\`\`\``;
    }
    const tasks = tasksResult.data;
    if (tasks.length === 0) {
        return `\`\`\`\n${milestoneId}-${sliceId}: ${phase}\n\`\`\``;
    }
    // Calculate wave position
    const wavesResult = detectWavesFromStores(deps, sliceId);
    if (!wavesResult.ok) {
        // Fall back to phase-only if wave detection fails
        return `\`\`\`\n${milestoneId}-${sliceId}: ${phase}\n\`\`\``;
    }
    const waves = wavesResult.data;
    const currentWave = determineCurrentWave(tasks, waves);
    const totalWaves = waves.length;
    const waveDisplay = totalWaves > 0 ? `Wave ${currentWave}/${totalWaves}` : "Wave 1/1";
    // Determine next commands based on phase
    const nextCommands = getNextCommands(phase);
    // Format compact reminder
    return `\`\`\`\n${milestoneId}-${sliceId}: ${phase} | ${waveDisplay} | Next: ${nextCommands}\n\`\`\``;
}
//# sourceMappingURL=generate-reminder.js.map