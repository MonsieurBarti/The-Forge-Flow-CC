import type { DatabaseInit } from "../../../domain/ports/database-init.port.js";
import type { DependencyStore } from "../../../domain/ports/dependency-store.port.js";
import type { JournalRepository } from "../../../domain/ports/journal-repository.port.js";
import type { MilestoneStore } from "../../../domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../domain/ports/project-store.port.js";
import type { ReviewStore } from "../../../domain/ports/review-store.port.js";
import type { SessionStore } from "../../../domain/ports/session-store.port.js";
import type { SliceStore } from "../../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../domain/ports/task-store.port.js";
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
export declare function createStateStoresUnchecked(dbPath?: string): StateStores;
export declare function createStateStores(dbPath?: string): StateStores;
export interface ClosableStateStores extends StateStores {
    close(): void;
    checkpoint(): void;
}
export declare function createClosableStateStoresUnchecked(dbPath?: string): ClosableStateStores;
export declare function createClosableStateStores(dbPath?: string): ClosableStateStores;
//# sourceMappingURL=create-state-stores.d.ts.map