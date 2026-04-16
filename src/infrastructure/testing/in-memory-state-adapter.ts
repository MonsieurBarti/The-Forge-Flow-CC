import type { Milestone } from "../../domain/entities/milestone.js";
import type { Project } from "../../domain/entities/project.js";
import type { Slice } from "../../domain/entities/slice.js";
import { transitionSlice } from "../../domain/entities/slice.js";
import type { Task } from "../../domain/entities/task.js";
import { alreadyClaimedError } from "../../domain/errors/already-claimed.error.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import { hasOpenChildrenError } from "../../domain/errors/has-open-children.error.js";
import type { DomainEvent } from "../../domain/events/domain-event.js";
import { milestoneBranchName } from "../../domain/helpers/branch-naming.js";
import type { DatabaseInit } from "../../domain/ports/database-init.port.js";
import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../domain/ports/project-store.port.js";
import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { Err, Ok, type Result } from "../../domain/result.js";
import type { Dependency } from "../../domain/value-objects/dependency.js";
import type { MilestoneProps } from "../../domain/value-objects/milestone-props.js";
import type { MilestoneUpdateProps } from "../../domain/value-objects/milestone-update-props.js";
import type { ProjectProps } from "../../domain/value-objects/project-props.js";
import type { ReviewRecord, ReviewType } from "../../domain/value-objects/review-record.js";
import type { SliceProps } from "../../domain/value-objects/slice-props.js";
import type { SliceStatus } from "../../domain/value-objects/slice-status.js";
import type { SliceUpdateProps } from "../../domain/value-objects/slice-update-props.js";
import type { TaskProps } from "../../domain/value-objects/task-props.js";
import type { TaskUpdateProps } from "../../domain/value-objects/task-update-props.js";
import type { WorkflowSession } from "../../domain/value-objects/workflow-session.js";

export class InMemoryStateAdapter
	implements
		DatabaseInit,
		ProjectStore,
		MilestoneStore,
		SliceStore,
		TaskStore,
		DependencyStore,
		SessionStore,
		ReviewStore
{
	private project: Project | null = null;
	private milestones = new Map<string, Milestone>();
	private slices = new Map<string, Slice>();
	private tasks = new Map<string, Task>();
	public dependencies: Array<{ fromId: string; toId: string; type: string }> = [];
	private session: WorkflowSession | null = null;
	private reviews: ReviewRecord[] = [];

	init(): Result<void, DomainError> {
		return Ok(undefined);
	}

	// ProjectStore
	getProject(): Result<Project | null, DomainError> {
		return Ok(this.project);
	}

	saveProject(props: ProjectProps): Result<Project, DomainError> {
		const project: Project = {
			id: "singleton",
			name: props.name,
			vision: props.vision,
			createdAt: this.project?.createdAt ?? new Date(),
		};
		this.project = project;
		return Ok(project);
	}

	// MilestoneStore
	createMilestone(props: MilestoneProps): Result<Milestone, DomainError> {
		// Use provided id or generate a new UUID
		const id = props.id ?? crypto.randomUUID();
		// Use provided branch or compute from UUID
		const branch = props.branch ?? milestoneBranchName(id);
		const milestone: Milestone = {
			id,
			projectId: "singleton",
			number: props.number,
			name: props.name,
			status: "open",
			branch,
			createdAt: new Date(),
		};
		this.milestones.set(id, milestone);
		return Ok(milestone);
	}

	getMilestone(id: string): Result<Milestone | null, DomainError> {
		return Ok(this.milestones.get(id) ?? null);
	}

	listMilestones(): Result<Milestone[], DomainError> {
		return Ok([...this.milestones.values()]);
	}

	updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError> {
		const ms = this.milestones.get(id);
		if (!ms) return Ok(undefined);
		if (updates.name !== undefined) ms.name = updates.name;
		if (updates.status !== undefined) ms.status = updates.status;
		this.milestones.set(id, ms);
		return Ok(undefined);
	}

	closeMilestone(id: string, reason?: string): Result<void, DomainError> {
		const ms = this.milestones.get(id);
		if (!ms) return Ok(undefined);
		const openSlices = [...this.slices.values()].filter(
			(s) => s.milestoneId === id && s.status !== "closed",
		);
		if (openSlices.length > 0) {
			return Err(hasOpenChildrenError(id, openSlices.length));
		}
		ms.status = "closed";
		ms.closeReason = reason;
		this.milestones.set(id, ms);
		return Ok(undefined);
	}

	// SliceStore
	createSlice(props: SliceProps): Result<Slice, DomainError> {
		const milestone = this.milestones.get(props.milestoneId);
		if (!milestone) {
			return Err(createDomainError("NOT_FOUND", `Milestone "${props.milestoneId}" not found`));
		}
		// Use provided id or generate a new UUID
		const id = props.id ?? crypto.randomUUID();
		const slice: Slice = {
			id,
			milestoneId: props.milestoneId,
			number: props.number,
			title: props.title,
			status: "discussing",
			tier: props.tier,
			createdAt: new Date(),
		};
		this.slices.set(id, slice);
		return Ok(slice);
	}

	getSlice(id: string): Result<Slice | null, DomainError> {
		return Ok(this.slices.get(id) ?? null);
	}

	listSlices(milestoneId?: string): Result<Slice[], DomainError> {
		const all = [...this.slices.values()];
		if (milestoneId) {
			return Ok(all.filter((s) => s.milestoneId === milestoneId));
		}
		return Ok(all);
	}

	updateSlice(id: string, updates: SliceUpdateProps): Result<void, DomainError> {
		const slice = this.slices.get(id);
		if (!slice) return Ok(undefined);
		if (updates.title !== undefined) slice.title = updates.title;
		if (updates.tier !== undefined) slice.tier = updates.tier;
		this.slices.set(id, slice);
		return Ok(undefined);
	}

	transitionSlice(id: string, target: SliceStatus): Result<DomainEvent[], DomainError> {
		const slice = this.slices.get(id);
		if (!slice) {
			return Err(createDomainError("NOT_FOUND", `Slice "${id}" not found`));
		}
		const domainResult = transitionSlice(slice, target);
		if (!domainResult.ok) return domainResult;
		this.slices.set(id, domainResult.data.slice);
		return Ok(domainResult.data.events);
	}

	// TaskStore
	createTask(props: TaskProps): Result<Task, DomainError> {
		const id = `${props.sliceId}-T${props.number.toString().padStart(2, "0")}`;
		const task: Task = {
			id,
			sliceId: props.sliceId,
			number: props.number,
			title: props.title,
			description: props.description,
			status: "open",
			wave: props.wave,
			createdAt: new Date(),
		};
		this.tasks.set(id, task);
		return Ok(task);
	}

	getTask(id: string): Result<Task | null, DomainError> {
		return Ok(this.tasks.get(id) ?? null);
	}

	listTasks(sliceId: string): Result<Task[], DomainError> {
		return Ok([...this.tasks.values()].filter((t) => t.sliceId === sliceId));
	}

	updateTask(id: string, updates: TaskUpdateProps): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task) return Ok(undefined);
		if (updates.title !== undefined) task.title = updates.title;
		if (updates.description !== undefined) task.description = updates.description;
		if (updates.wave !== undefined) task.wave = updates.wave;
		this.tasks.set(id, task);
		return Ok(undefined);
	}

	claimTask(id: string, claimedBy?: string): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task || task.status !== "open") {
			return Err(alreadyClaimedError(id));
		}
		task.status = "in_progress";
		task.claimedAt = new Date();
		if (claimedBy !== undefined) {
			task.claimedBy = claimedBy;
		}
		this.tasks.set(id, task);
		return Ok(undefined);
	}

	getExecutorsForSlice(sliceId: string): Result<string[], DomainError> {
		const executors = [
			...new Set(
				[...this.tasks.values()]
					.filter((t) => t.sliceId === sliceId && t.claimedBy !== undefined)
					.map((t) => t.claimedBy as string),
			),
		];
		return Ok(executors);
	}

	closeTask(id: string, reason?: string): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task) return Ok(undefined);
		task.status = "closed";
		task.closedReason = reason;
		this.tasks.set(id, task);
		return Ok(undefined);
	}

	listReadyTasks(sliceId: string): Result<Task[], DomainError> {
		const sliceTasks = [...this.tasks.values()].filter(
			(t) => t.sliceId === sliceId && t.status === "open",
		);
		const ready = sliceTasks.filter((task) => {
			// Find all deps where this task is the "from" side (task depends on toId)
			const blocking = this.dependencies.filter((d) => d.fromId === task.id);
			return blocking.every((dep) => {
				const blocker = this.tasks.get(dep.toId);
				return blocker?.status === "closed";
			});
		});
		return Ok(ready);
	}

	listStaleClaims(ttlMinutes: number): Result<Task[], DomainError> {
		const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
		const stale = [...this.tasks.values()].filter(
			(t) => t.status === "in_progress" && t.claimedAt !== undefined && t.claimedAt < cutoff,
		);
		return Ok(stale);
	}

	// DependencyStore
	addDependency(fromId: string, toId: string, type: "blocks"): Result<void, DomainError> {
		const existing = this.dependencies.find((d) => d.fromId === fromId && d.toId === toId);
		if (!existing) {
			this.dependencies.push({ fromId, toId, type });
		}
		return Ok(undefined);
	}

	removeDependency(fromId: string, toId: string): Result<void, DomainError> {
		this.dependencies = this.dependencies.filter((d) => !(d.fromId === fromId && d.toId === toId));
		return Ok(undefined);
	}

	getDependencies(taskId: string): Result<Dependency[], DomainError> {
		const deps = this.dependencies
			.filter((d) => d.fromId === taskId || d.toId === taskId)
			.map((d) => ({ fromId: d.fromId, toId: d.toId, type: d.type as "blocks" }));
		return Ok(deps);
	}

	// SessionStore
	getSession(): Result<WorkflowSession | null, DomainError> {
		return Ok(this.session);
	}

	saveSession(session: WorkflowSession): Result<void, DomainError> {
		this.session = session;
		return Ok(undefined);
	}

	// ReviewStore
	recordReview(review: ReviewRecord): Result<void, DomainError> {
		this.reviews.push(review);
		return Ok(undefined);
	}

	getLatestReview(sliceId: string, type: ReviewType): Result<ReviewRecord | null, DomainError> {
		const matching = this.reviews
			.filter((r) => r.sliceId === sliceId && r.type === type)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return Ok(matching[0] ?? null);
	}

	listReviews(sliceId: string): Result<ReviewRecord[], DomainError> {
		return Ok(this.reviews.filter((r) => r.sliceId === sliceId));
	}

	// Test helpers
	seedReviews(reviews: ReviewRecord[]): void {
		this.reviews.push(...reviews);
	}

	seedExecutors(sliceId: string, agents: string[]): void {
		agents.forEach((agent, idx) => {
			const id = `${sliceId}-executor-seed-${idx}`;
			const existing = this.tasks.get(id);
			if (existing) {
				existing.claimedBy = agent;
				this.tasks.set(id, existing);
			} else {
				const task: Task = {
					id,
					sliceId,
					number: 9000 + idx,
					title: `__seed_executor_${agent}`,
					status: "in_progress",
					claimedBy: agent,
					claimedAt: new Date(),
					createdAt: new Date(),
				};
				this.tasks.set(id, task);
			}
		});
	}
}
