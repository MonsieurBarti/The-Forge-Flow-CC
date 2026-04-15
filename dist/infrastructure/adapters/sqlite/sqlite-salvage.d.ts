import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { Result } from "../../../domain/result.js";
import { type StateSnapshot } from "../../../domain/value-objects/state-snapshot.js";
/**
 * Metadata about the salvage operation.
 */
export interface SalvageMetadata {
    /** Tables that were successfully salvaged */
    tablesSalvaged: string[];
    /** Total rows recovered across all tables */
    rowsRecovered: number;
    /** Notes about corruption encountered during salvage */
    corruptionNotes: string[];
    /** PRAGMA integrity_check result if available */
    integrityCheckResult?: string;
    /** PRAGMA quick_check result if available */
    quickCheckResult?: string;
}
/**
 * Result of a salvage operation containing partial snapshot and metadata.
 */
export interface SalvageResult {
    snapshot: StateSnapshot | null;
    metadata: SalvageMetadata;
}
/**
 * Utility class for salvaging data from corrupted SQLite databases.
 * Uses defensive extraction - attempts to recover whatever data is readable.
 */
export declare class SQLiteSalvage {
    /**
     * Attempts to salvage data from a corrupted SQLite database.
     * Opens the database in read-only mode and tries to extract all readable data.
     *
     * @param dbPath - Path to the potentially corrupted SQLite file
     * @returns Result containing salvaged snapshot and metadata, or DomainError on catastrophic failure
     */
    static salvage(dbPath: string): Result<SalvageResult, DomainError>;
    /**
     * Attempt to salvage project data (singleton table).
     */
    private static salvageProject;
    /**
     * Attempt to salvage milestones data.
     */
    private static salvageMilestones;
    /**
     * Attempt to salvage slices data.
     */
    private static salvageSlices;
    /**
     * Attempt to salvage tasks data.
     */
    private static salvageTasks;
    /**
     * Attempt to salvage dependencies data.
     */
    private static salvageDependencies;
    /**
     * Attempt to salvage workflow session data.
     */
    private static salvageSession;
    /**
     * Attempt to salvage reviews data.
     */
    private static salvageReviews;
}
//# sourceMappingURL=sqlite-salvage.d.ts.map