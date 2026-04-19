import type { Task } from "../../domain/entities/task.js";
import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { detectWavesFromStores } from "../waves/detect-waves.js";

export interface GenerateReminderDeps {
	sessionStore: SessionStore;
	taskStore: TaskStore;
	dependencyStore: DependencyStore;
}

/**
 * Determine the current wave position based on task statuses.
 * Current wave is the first wave that has at least one non-completed task.
 */
function determineCurrentWave(
	tasks: Task[],
	waves: { index: number; taskIds: string[] }[],
): number {
	if (waves.length === 0) return 0;

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
 * Get the next recommended commands based on the current slice status / phase.
 *
 * Mapping aligns with @references/next-steps.md so the suggested command matches
 * the slice's ACTUAL status rather than a hardcoded default.
 *
 * Lifecycle: discussing → researching → planning → executing → verifying →
 *            reviewing → completing → closed
 */
function getNextCommands(phase: string): string {
	switch (phase) {
		case "discussing":
			return "/tff:discuss";
		case "researching":
			return "/tff:research";
		case "planning":
			return "/tff:plan";
		case "executing":
			return "/tff:execute or /tff:pause";
		case "verifying":
			return "/tff:verify";
		case "reviewing":
			return "/tff:ship";
		case "completing":
			return "/tff:complete-milestone";
		case "closed":
			// Current slice done — move to next slice, which starts in `discussing`.
			return "/tff:discuss or /tff:progress";
		case "paused":
			return "/tff:resume or /tff:stop";
		case "transitioning":
			return "/tff:next or /tff:back";
		default:
			return "/tff:status";
	}
}

/**
 * Generate a compact reminder string for the current session state.
 * Returns null if no active session exists.
 */
export function generateReminder(deps: GenerateReminderDeps): string | null {
	const sessionResult = deps.sessionStore.getSession();
	if (!sessionResult.ok) return null;

	const session = sessionResult.data;
	if (!session?.activeSliceId || !session.activeMilestoneId) return null;

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
