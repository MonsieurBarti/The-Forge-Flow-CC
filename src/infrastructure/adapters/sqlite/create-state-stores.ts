import path from "node:path";
import type { DatabaseInit } from "../../../domain/ports/database-init.port.js";
import type { DependencyStore } from "../../../domain/ports/dependency-store.port.js";
import type { JournalRepository } from "../../../domain/ports/journal-repository.port.js";
import type { MilestoneStore } from "../../../domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../domain/ports/project-store.port.js";
import type { ReviewStore } from "../../../domain/ports/review-store.port.js";
import type { SessionStore } from "../../../domain/ports/session-store.port.js";
import type { SliceStore } from "../../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../domain/ports/task-store.port.js";
import { JsonlJournalAdapter } from "../journal/jsonl-journal.adapter.js";
import { SQLiteStateAdapter } from "./sqlite-state.adapter.js";

export interface StateStores {
	db: DatabaseInit;
	projectStore: ProjectStore;
	milestoneStore: MilestoneStore;
	sliceStore: SliceStore;
	taskStore: TaskStore;
	dependencyStore: DependencyStore;
	sessionStore: SessionStore;
	reviewStore: ReviewStore;
	journalRepository: JournalRepository;
}

export function createStateStoresUnchecked(dbPath?: string): StateStores {
	const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
	const adapter = SQLiteStateAdapter.create(resolvedPath);
	const initResult = adapter.init();
	if (!initResult.ok) throw new Error(`DB init failed: ${initResult.error.message}`);
	const tffDir = path.dirname(resolvedPath);
	const journalPath = path.join(tffDir, "journal");
	const journalRepository = new JsonlJournalAdapter(journalPath);
	return {
		db: adapter,
		projectStore: adapter,
		milestoneStore: adapter,
		sliceStore: adapter,
		taskStore: adapter,
		dependencyStore: adapter,
		sessionStore: adapter,
		reviewStore: adapter,
		journalRepository,
	};
}

export function createStateStores(dbPath?: string): StateStores {
	return createStateStoresUnchecked(dbPath);
}

export interface ClosableStateStores extends StateStores {
	close(): void;
	checkpoint(): void;
}

export function createClosableStateStoresUnchecked(dbPath?: string): ClosableStateStores {
	const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
	const adapter = SQLiteStateAdapter.create(resolvedPath);
	const initResult = adapter.init();
	if (!initResult.ok) throw new Error(`DB init failed: ${initResult.error.message}`);
	const tffDir = path.dirname(resolvedPath);
	const journalPath = path.join(tffDir, "journal");
	const journalRepository = new JsonlJournalAdapter(journalPath);
	return {
		db: adapter,
		projectStore: adapter,
		milestoneStore: adapter,
		sliceStore: adapter,
		taskStore: adapter,
		dependencyStore: adapter,
		sessionStore: adapter,
		reviewStore: adapter,
		journalRepository,
		close: () => adapter.close(),
		checkpoint: () => adapter.checkpoint(),
	};
}

export function createClosableStateStores(dbPath?: string): ClosableStateStores {
	return createClosableStateStoresUnchecked(dbPath);
}
