import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type { StateExporter } from "../../../domain/ports/state-exporter.port.js";
import type { Result } from "../../../domain/result.js";
import { Err, Ok } from "../../../domain/result.js";
import type { StateSnapshot } from "../../../domain/value-objects/state-snapshot.js";
import { STATE_SNAPSHOT_VERSION } from "../../../domain/value-objects/state-snapshot.js";
import type { SQLiteStateAdapter } from "../sqlite/sqlite-state.adapter.js";

/**
 * Exports complete state from SQLite to a portable JSON snapshot.
 * Uses the public methods of SQLiteStateAdapter to ensure consistency.
 */
export class SQLiteStateExporter implements StateExporter {
	constructor(private readonly adapter: SQLiteStateAdapter) {}

	export(): Result<StateSnapshot, DomainError> {
		try {
			// Export project (singleton, may be null)
			const projectResult = this.adapter.getProject();
			if (!projectResult.ok) return projectResult;
			const project = projectResult.data;

			// Export milestones
			const milestonesResult = this.adapter.listMilestones();
			if (!milestonesResult.ok) return milestonesResult;
			const milestones = milestonesResult.data;

			// Export slices (all slices across all milestones)
			const slicesResult = this.adapter.listSlices();
			if (!slicesResult.ok) return slicesResult;
			const slices = slicesResult.data;

			// Export tasks (need to collect from all slices)
			const tasks: Array<{
				id: string;
				sliceId: string;
				number: number;
				title: string;
				description?: string;
				status: "open" | "in_progress" | "closed";
				wave?: number;
				claimedAt?: Date;
				claimedBy?: string;
				closedReason?: string;
				createdAt: Date;
			}> = [];
			for (const slice of slices) {
				const tasksResult = this.adapter.listTasks(slice.id);
				if (!tasksResult.ok) return tasksResult;
				tasks.push(...tasksResult.data);
			}

			// Export dependencies (collect from all tasks, deduplicate)
			const dependencyMap = new Map<string, { fromId: string; toId: string; type: "blocks" }>();
			for (const task of tasks) {
				const depsResult = this.adapter.getDependencies(task.id);
				if (!depsResult.ok) return depsResult;
				for (const dep of depsResult.data) {
					const key = `${dep.fromId}→${dep.toId}`;
					dependencyMap.set(key, dep);
				}
			}
			const dependencies = Array.from(dependencyMap.values());

			// Export session (may be null)
			const sessionResult = this.adapter.getSession();
			if (!sessionResult.ok) return sessionResult;
			const session = sessionResult.data;

			// Export reviews (collect from all slices)
			const reviews: Array<{
				sliceId: string;
				type: "code" | "security" | "spec";
				reviewer: string;
				verdict: "approved" | "changes_requested";
				commitSha: string;
				notes?: string;
				createdAt: string;
			}> = [];
			for (const slice of slices) {
				const reviewsResult = this.adapter.listReviews(slice.id);
				if (!reviewsResult.ok) return reviewsResult;
				reviews.push(...reviewsResult.data);
			}

			// Build snapshot
			const snapshot: StateSnapshot = {
				version: STATE_SNAPSHOT_VERSION,
				exportedAt: new Date().toISOString(),
				project,
				milestones,
				slices,
				tasks,
				dependencies,
				workflowSession: session,
				reviews,
			};

			return Ok(snapshot);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Err(createDomainError("WRITE_FAILURE", `Export failed: ${message}`));
		}
	}
}
