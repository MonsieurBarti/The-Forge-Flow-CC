import type { DatabaseInit } from "../../src/domain/ports/database-init.port.js";
import type { DependencyStore } from "../../src/domain/ports/dependency-store.port.js";
import type { JournalRepository } from "../../src/domain/ports/journal-repository.port.js";
import type { MilestoneStore } from "../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../src/domain/ports/project-store.port.js";
import type { ReviewStore } from "../../src/domain/ports/review-store.port.js";
import type { SessionStore } from "../../src/domain/ports/session-store.port.js";
import type { SliceStore } from "../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../src/domain/ports/task-store.port.js";
import type { Result } from "../../src/domain/result.js";

/**
 * Helper to create a mock result that satisfies the Result type
 */
export function ok<T>(data: T): Result<T, never> {
	return { ok: true, data } as Result<T, never>;
}

export function okVoid(): Result<void, never> {
	return { ok: true, data: undefined } as Result<void, never>;
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error } as Result<never, E>;
}

/**
 * Create a minimal mock SliceStore for testing.
 * Methods can be overridden in individual tests with vi.fn().
 */
export function createMockSliceStore(): Partial<SliceStore> {
	return {
		createSlice: vi.fn(),
		getSlice: vi.fn(),
		listSlices: vi.fn(),
		updateSlice: vi.fn(),
		transitionSlice: vi.fn(),
	};
}

/**
 * Create a minimal mock MilestoneStore for testing.
 */
export function createMockMilestoneStore(): Partial<MilestoneStore> {
	return {
		createMilestone: vi.fn(),
		getMilestone: vi.fn(),
		listMilestones: vi.fn(),
		updateMilestone: vi.fn(),
		closeMilestone: vi.fn(),
	};
}

/**
 * Create a minimal mock TaskStore for testing.
 */
export function createMockTaskStore(): Partial<TaskStore> {
	return {
		createTask: vi.fn(),
		getTask: vi.fn(),
		listTasks: vi.fn(),
		updateTask: vi.fn(),
		claimTask: vi.fn(),
		closeTask: vi.fn(),
		listReadyTasks: vi.fn(),
		listStaleClaims: vi.fn(),
		getExecutorsForSlice: vi.fn(),
	};
}

/**
 * Create a minimal mock ProjectStore for testing.
 */
export function createMockProjectStore(): Partial<ProjectStore> {
	return {
		getProject: vi.fn(),
		saveProject: vi.fn(),
	};
}

/**
 * Create a minimal mock DependencyStore for testing.
 */
export function createMockDependencyStore(): Partial<DependencyStore> {
	return {
		addDependency: vi.fn(),
		removeDependency: vi.fn(),
		getDependencies: vi.fn(),
	};
}

/**
 * Create a minimal mock SessionStore for testing.
 */
export function createMockSessionStore(): Partial<SessionStore> {
	return {
		getSession: vi.fn(),
		saveSession: vi.fn(),
	};
}

/**
 * Create a minimal mock ReviewStore for testing.
 */
export function createMockReviewStore(): Partial<ReviewStore> {
	return {
		recordReview: vi.fn(),
		getLatestReview: vi.fn(),
		listReviews: vi.fn(),
	};
}

/**
 * Create a minimal mock JournalRepository for testing.
 */
export function createMockJournalRepository(): Partial<JournalRepository> {
	return {
		append: vi.fn(),
		readAll: vi.fn(),
		readSince: vi.fn(),
		count: vi.fn(),
	};
}

/**
 * Create a minimal mock DatabaseInit for testing.
 */
export function createMockDatabaseInit(): Partial<DatabaseInit> {
	return {
		init: vi.fn(),
	};
}

import { vi } from "vitest";
import type { StateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

/**
 * Create a complete mock StateStores object for testing.
 * All stores are partial mocks with vi.fn() stubs.
 */
export function createMockStateStores(): StateStores {
	return {
		db: createMockDatabaseInit() as DatabaseInit,
		projectStore: createMockProjectStore() as ProjectStore,
		milestoneStore: createMockMilestoneStore() as MilestoneStore,
		sliceStore: createMockSliceStore() as SliceStore,
		taskStore: createMockTaskStore() as TaskStore,
		dependencyStore: createMockDependencyStore() as DependencyStore,
		sessionStore: createMockSessionStore() as SessionStore,
		reviewStore: createMockReviewStore() as ReviewStore,
		journalRepository: createMockJournalRepository() as JournalRepository,
	};
}
