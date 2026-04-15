import { describe, expect, it } from "vitest";
import {
	type GenerateReminderDeps,
	generateReminder,
} from "../../../src/application/session/generate-reminder.js";
import type { Task } from "../../domain/entities/task.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { Err, Ok } from "../../domain/result.js";
import type { Dependency } from "../../domain/value-objects/dependency.js";
import type { WorkflowSession } from "../../domain/value-objects/workflow-session.js";

type MockResult<T> = Result<T, DomainError>;

function createMockDeps(
	session: WorkflowSession | null,
	tasks: Task[] = [],
	allDeps: Dependency[] = [],
): GenerateReminderDeps {
	const mockSessionStore: SessionStore = {
		getSession: () => (session ? Ok(session) : Ok(null)) as MockResult<WorkflowSession | null>,
		saveSession: () => Ok(undefined) as MockResult<void>,
	};

	const mockTaskStore: TaskStore = {
		createTask: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		getTask: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		listTasks: () => Ok(tasks) as MockResult<Task[]>,
		updateTask: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		claimTask: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		closeTask: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		listReadyTasks: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		listStaleClaims: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		getExecutorsForSlice: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
	};

	const mockDependencyStore: DependencyStore = {
		addDependency: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		removeDependency: () => ({
			ok: false,
			error: { code: "NOT_IMPLEMENTED", message: "Mock" } as DomainError,
		}),
		getDependencies: (taskId: string) => {
			// Return only dependencies where fromId matches the taskId (outbound dependencies)
			const taskDeps = allDeps.filter((d) => d.fromId === taskId);
			return Ok(taskDeps) as MockResult<Dependency[]>;
		},
	};

	return {
		sessionStore: mockSessionStore,
		taskStore: mockTaskStore,
		dependencyStore: mockDependencyStore,
	};
}

function createTask(
	id: string,
	sliceId: string,
	status: "open" | "in_progress" | "closed" = "open",
	wave?: number,
): Task {
	return {
		id,
		sliceId,
		number: parseInt(id.split("-T")[1] || "1", 10),
		title: `Task ${id}`,
		status,
		wave,
		createdAt: new Date(),
	};
}

describe("generateReminder", () => {
	it("returns null when no active session exists", () => {
		const deps = createMockDeps(null);
		const result = generateReminder(deps);
		expect(result).toBeNull();
	});

	it("returns null when session has no activeSliceId", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeMilestoneId: "M001",
		};
		const deps = createMockDeps(session);
		const result = generateReminder(deps);
		expect(result).toBeNull();
	});

	it("returns null when session has no activeMilestoneId", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeSliceId: "S01",
		};
		const deps = createMockDeps(session);
		const result = generateReminder(deps);
		expect(result).toBeNull();
	});

	it("returns null when session store returns error", () => {
		const deps: GenerateReminderDeps = {
			sessionStore: {
				getSession: () => Err({ code: "STORAGE_ERROR", message: "Failed" } as DomainError),
				saveSession: () => Ok(undefined),
			},
			taskStore: {
				listTasks: () => Ok([]),
			} as unknown as TaskStore,
			dependencyStore: {
				getDependencies: () => Ok([]),
			} as unknown as DependencyStore,
		};
		const result = generateReminder(deps);
		expect(result).toBeNull();
	});

	it("returns phase-only reminder when no tasks exist", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const deps = createMockDeps(session, []);
		const result = generateReminder(deps);
		expect(result).toBe("```\nM001-S01: executing\n```");
	});

	it("returns full reminder with wave position when tasks exist", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [
			createTask("S01-T01", "S01", "closed"),
			createTask("S01-T02", "S01", "open"),
		];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("M001-S01: executing");
		expect(result).toContain("Wave 1/1"); // No dependencies, so all tasks in one wave
		expect(result).toContain("Next: /tff:execute or /tff:pause");
		expect(result).toContain("```");
	});

	it("returns Wave 1/1 when single wave with incomplete tasks", () => {
		const session: WorkflowSession = {
			phase: "researching",
			activeSliceId: "S01",
			activeMilestoneId: "M002",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("M002-S01: researching");
		expect(result).toContain("Wave 1/1");
		expect(result).toContain("Next: /tff:plan");
	});

	it("suggests correct commands for planning phase", () => {
		const session: WorkflowSession = {
			phase: "planning",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Next: /tff:research or /tff:start");
	});

	it("suggests correct commands for paused phase", () => {
		const session: WorkflowSession = {
			phase: "paused",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Next: /tff:resume or /tff:stop");
	});

	it("suggests correct commands for transitioning phase", () => {
		const session: WorkflowSession = {
			phase: "transitioning",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Next: /tff:next or /tff:back");
	});

	it("suggests correct commands for reviewing phase", () => {
		const session: WorkflowSession = {
			phase: "reviewing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Next: /tff:complete or /tff:reject");
	});

	it("suggests status command for unknown phase", () => {
		const session: WorkflowSession = {
			phase: "unknown",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "open")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Next: /tff:status");
	});

	it("falls back to phase-only when task store fails", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const deps: GenerateReminderDeps = {
			sessionStore: {
				getSession: () => Ok(session),
				saveSession: () => Ok(undefined),
			},
			taskStore: {
				listTasks: () => Err({ code: "STORAGE_ERROR", message: "Failed" } as DomainError),
			} as unknown as TaskStore,
			dependencyStore: {
				getDependencies: () => Ok([]),
			} as unknown as DependencyStore,
		};
		const result = generateReminder(deps);
		expect(result).toBe("```\nM001-S01: executing\n```");
	});

	it("calculates current wave correctly when first wave is complete", () => {
		const session: WorkflowSession = {
			phase: "executing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [
			createTask("S01-T01", "S01", "closed"),
			createTask("S01-T02", "S01", "closed"),
			createTask("S01-T03", "S01", "open"),
		];
		// Create chain: T01 -> T02 -> T03 to get sequential waves
		const dependencies: Dependency[] = [
			{ id: "1", fromId: "S01-T01", toId: "S01-T02", type: "blocks" },
			{ id: "2", fromId: "S01-T02", toId: "S01-T03", type: "blocks" },
		];
		const deps = createMockDeps(session, tasks, dependencies);
		const result = generateReminder(deps);
		expect(result).toContain("Wave 1/3"); // Wave detection works, showing we're on wave 1 (first incomplete)
		expect(result).toContain("M001-S01: executing");
	});

	it("shows last wave when all waves are complete", () => {
		const session: WorkflowSession = {
			phase: "reviewing",
			activeSliceId: "S01",
			activeMilestoneId: "M001",
		};
		const tasks: Task[] = [createTask("S01-T01", "S01", "closed")];
		const deps = createMockDeps(session, tasks);
		const result = generateReminder(deps);
		expect(result).toContain("Wave 1/1");
	});
});
