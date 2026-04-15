import Database from "better-sqlite3";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import { Err, Ok } from "../../../domain/result.js";
import { STATE_SNAPSHOT_VERSION, } from "../../../domain/value-objects/state-snapshot.js";
import { getNativeBindingPath } from "./load-native-binding.js";
/**
 * Utility class for salvaging data from corrupted SQLite databases.
 * Uses defensive extraction - attempts to recover whatever data is readable.
 */
export class SQLiteSalvage {
    /**
     * Attempts to salvage data from a corrupted SQLite database.
     * Opens the database in read-only mode and tries to extract all readable data.
     *
     * @param dbPath - Path to the potentially corrupted SQLite file
     * @returns Result containing salvaged snapshot and metadata, or DomainError on catastrophic failure
     */
    static salvage(dbPath) {
        let db;
        try {
            // Open in read-only mode with timeout for resilience
            const nativeBinding = getNativeBindingPath();
            db = new Database(dbPath, {
                readonly: true,
                timeout: 5000, // 5 second timeout for queries
                ...(nativeBinding ? { nativeBinding } : {}),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return Err(createDomainError("CORRUPTED_STATE", `Failed to open database for salvage: ${message}`));
        }
        try {
            const metadata = {
                tablesSalvaged: [],
                rowsRecovered: 0,
                corruptionNotes: [],
            };
            // Run integrity checks to assess corruption scope
            try {
                const integrityResult = db.pragma("integrity_check", { simple: true });
                metadata.integrityCheckResult = integrityResult;
                if (integrityResult !== "ok") {
                    metadata.corruptionNotes.push(`Integrity check: ${integrityResult}`);
                }
            }
            catch (e) {
                metadata.corruptionNotes.push(`Integrity check failed: ${e}`);
            }
            try {
                const quickCheckResult = db.pragma("quick_check", { simple: true });
                metadata.quickCheckResult = quickCheckResult;
                if (quickCheckResult !== "ok") {
                    metadata.corruptionNotes.push(`Quick check: ${quickCheckResult}`);
                }
            }
            catch (e) {
                metadata.corruptionNotes.push(`Quick check failed: ${e}`);
            }
            // Attempt to salvage each table individually
            const project = SQLiteSalvage.salvageProject(db, metadata);
            const milestones = SQLiteSalvage.salvageMilestones(db, metadata);
            const slices = SQLiteSalvage.salvageSlices(db, metadata);
            const tasks = SQLiteSalvage.salvageTasks(db, metadata);
            const dependencies = SQLiteSalvage.salvageDependencies(db, metadata);
            const session = SQLiteSalvage.salvageSession(db, metadata);
            const reviews = SQLiteSalvage.salvageReviews(db, metadata);
            // Only create snapshot if we salvaged at least some data
            let snapshot = null;
            if (metadata.tablesSalvaged.length > 0) {
                snapshot = {
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
            }
            return Ok({ snapshot, metadata });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return Err(createDomainError("CORRUPTED_STATE", `Salvage operation failed: ${message}`));
        }
        finally {
            try {
                db.close();
            }
            catch {
                // Ignore close errors
            }
        }
    }
    /**
     * Attempt to salvage project data (singleton table).
     */
    static salvageProject(db, metadata) {
        try {
            const row = db
                .prepare("SELECT id, name, vision, created_at FROM project WHERE id = 'singleton'")
                .get();
            if (!row) {
                metadata.corruptionNotes.push("Project: No project row found");
                return null;
            }
            // Validate required fields
            if (!row.name || typeof row.name !== "string") {
                metadata.corruptionNotes.push("Project: Missing or invalid name field");
                return null;
            }
            if (!row.created_at) {
                metadata.corruptionNotes.push("Project: Missing created_at field");
                return null;
            }
            // Parse date with fallback
            let createdAt;
            try {
                createdAt = new Date(row.created_at);
                if (Number.isNaN(createdAt.getTime())) {
                    createdAt = new Date(); // Fallback to now
                    metadata.corruptionNotes.push(`Project: Invalid created_at date "${row.created_at}", using current time`);
                }
            }
            catch {
                createdAt = new Date();
                metadata.corruptionNotes.push(`Project: Failed to parse created_at "${row.created_at}", using current time`);
            }
            metadata.tablesSalvaged.push("project");
            metadata.rowsRecovered += 1;
            return {
                id: row.id,
                name: row.name,
                vision: row.vision ?? undefined,
                createdAt,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Project: Query failed - ${message}`);
            return null;
        }
    }
    /**
     * Attempt to salvage milestones data.
     */
    static salvageMilestones(db, metadata) {
        const milestones = [];
        try {
            const rows = db.prepare("SELECT * FROM milestone ORDER BY number").all();
            for (const row of rows) {
                try {
                    // Validate required fields
                    if (!row.id || typeof row.id !== "string") {
                        metadata.corruptionNotes.push(`Milestone: Skipping row with invalid id`);
                        continue;
                    }
                    if (!row.name || typeof row.name !== "string") {
                        metadata.corruptionNotes.push(`Milestone ${row.id}: Missing or invalid name`);
                        continue;
                    }
                    if (typeof row.number !== "number" || Number.isNaN(row.number)) {
                        metadata.corruptionNotes.push(`Milestone ${row.id}: Invalid number`);
                        continue;
                    }
                    // Parse date with fallback
                    let createdAt;
                    try {
                        createdAt = new Date(row.created_at);
                        if (Number.isNaN(createdAt.getTime())) {
                            createdAt = new Date();
                        }
                    }
                    catch {
                        createdAt = new Date();
                    }
                    milestones.push({
                        id: row.id,
                        projectId: row.project_id ?? "singleton",
                        number: row.number,
                        name: row.name,
                        status: row.status ?? "open",
                        closeReason: row.close_reason ?? undefined,
                        createdAt,
                    });
                }
                catch (rowError) {
                    const message = rowError instanceof Error ? rowError.message : String(rowError);
                    metadata.corruptionNotes.push(`Milestone row: ${message}`);
                }
            }
            metadata.tablesSalvaged.push("milestone");
            metadata.rowsRecovered += milestones.length;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Milestones: Query failed - ${message}`);
        }
        return milestones;
    }
    /**
     * Attempt to salvage slices data.
     */
    static salvageSlices(db, metadata) {
        const slices = [];
        try {
            const rows = db.prepare("SELECT * FROM slice ORDER BY milestone_id, number").all();
            for (const row of rows) {
                try {
                    // Validate required fields
                    if (!row.id || typeof row.id !== "string") {
                        metadata.corruptionNotes.push(`Slice: Skipping row with invalid id`);
                        continue;
                    }
                    if (!row.title || typeof row.title !== "string") {
                        metadata.corruptionNotes.push(`Slice ${row.id}: Missing or invalid title`);
                        continue;
                    }
                    if (!row.milestone_id || typeof row.milestone_id !== "string") {
                        metadata.corruptionNotes.push(`Slice ${row.id}: Missing or invalid milestone_id`);
                        continue;
                    }
                    if (typeof row.number !== "number" || Number.isNaN(row.number)) {
                        metadata.corruptionNotes.push(`Slice ${row.id}: Invalid number`);
                        continue;
                    }
                    // Parse date with fallback
                    let createdAt;
                    try {
                        createdAt = new Date(row.created_at);
                        if (Number.isNaN(createdAt.getTime())) {
                            createdAt = new Date();
                        }
                    }
                    catch {
                        createdAt = new Date();
                    }
                    slices.push({
                        id: row.id,
                        milestoneId: row.milestone_id,
                        number: row.number,
                        title: row.title,
                        status: row.status ?? "discussing",
                        tier: row.tier ?? undefined,
                        createdAt,
                    });
                }
                catch (rowError) {
                    const message = rowError instanceof Error ? rowError.message : String(rowError);
                    metadata.corruptionNotes.push(`Slice row: ${message}`);
                }
            }
            metadata.tablesSalvaged.push("slice");
            metadata.rowsRecovered += slices.length;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Slices: Query failed - ${message}`);
        }
        return slices;
    }
    /**
     * Attempt to salvage tasks data.
     */
    static salvageTasks(db, metadata) {
        const tasks = [];
        try {
            const rows = db.prepare("SELECT * FROM task ORDER BY slice_id, number").all();
            for (const row of rows) {
                try {
                    // Validate required fields
                    if (!row.id || typeof row.id !== "string") {
                        metadata.corruptionNotes.push(`Task: Skipping row with invalid id`);
                        continue;
                    }
                    if (!row.title || typeof row.title !== "string") {
                        metadata.corruptionNotes.push(`Task ${row.id}: Missing or invalid title`);
                        continue;
                    }
                    if (!row.slice_id || typeof row.slice_id !== "string") {
                        metadata.corruptionNotes.push(`Task ${row.id}: Missing or invalid slice_id`);
                        continue;
                    }
                    if (typeof row.number !== "number" || Number.isNaN(row.number)) {
                        metadata.corruptionNotes.push(`Task ${row.id}: Invalid number`);
                        continue;
                    }
                    // Parse dates with fallback
                    let createdAt;
                    try {
                        createdAt = new Date(row.created_at);
                        if (Number.isNaN(createdAt.getTime())) {
                            createdAt = new Date();
                        }
                    }
                    catch {
                        createdAt = new Date();
                    }
                    let claimedAt;
                    if (row.claimed_at) {
                        try {
                            claimedAt = new Date(row.claimed_at);
                            if (Number.isNaN(claimedAt.getTime())) {
                                claimedAt = undefined;
                            }
                        }
                        catch {
                            claimedAt = undefined;
                        }
                    }
                    tasks.push({
                        id: row.id,
                        sliceId: row.slice_id,
                        number: row.number,
                        title: row.title,
                        description: row.description ?? undefined,
                        status: row.status ?? "open",
                        wave: row.wave ?? undefined,
                        claimedAt,
                        claimedBy: row.claimed_by ?? undefined,
                        closedReason: row.closed_reason ?? undefined,
                        createdAt,
                    });
                }
                catch (rowError) {
                    const message = rowError instanceof Error ? rowError.message : String(rowError);
                    metadata.corruptionNotes.push(`Task row: ${message}`);
                }
            }
            metadata.tablesSalvaged.push("task");
            metadata.rowsRecovered += tasks.length;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Tasks: Query failed - ${message}`);
        }
        return tasks;
    }
    /**
     * Attempt to salvage dependencies data.
     */
    static salvageDependencies(db, metadata) {
        const dependencies = [];
        try {
            const rows = db.prepare("SELECT from_id, to_id, type FROM dependency").all();
            for (const row of rows) {
                try {
                    // Validate required fields
                    if (!row.from_id || typeof row.from_id !== "string") {
                        metadata.corruptionNotes.push(`Dependency: Skipping row with invalid from_id`);
                        continue;
                    }
                    if (!row.to_id || typeof row.to_id !== "string") {
                        metadata.corruptionNotes.push(`Dependency ${row.from_id}: Missing or invalid to_id`);
                        continue;
                    }
                    if (!row.type || typeof row.type !== "string") {
                        metadata.corruptionNotes.push(`Dependency ${row.from_id}→${row.to_id}: Missing or invalid type`);
                        continue;
                    }
                    dependencies.push({
                        fromId: row.from_id,
                        toId: row.to_id,
                        type: row.type,
                    });
                }
                catch (rowError) {
                    const message = rowError instanceof Error ? rowError.message : String(rowError);
                    metadata.corruptionNotes.push(`Dependency row: ${message}`);
                }
            }
            metadata.tablesSalvaged.push("dependency");
            metadata.rowsRecovered += dependencies.length;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Dependencies: Query failed - ${message}`);
        }
        return dependencies;
    }
    /**
     * Attempt to salvage workflow session data.
     */
    static salvageSession(db, metadata) {
        try {
            const row = db.prepare("SELECT * FROM workflow_session WHERE id = 1").get();
            if (!row) {
                return null;
            }
            // Validate required fields
            if (!row.phase || typeof row.phase !== "string") {
                metadata.corruptionNotes.push("Workflow session: Missing or invalid phase");
                return null;
            }
            metadata.tablesSalvaged.push("workflow_session");
            metadata.rowsRecovered += 1;
            return {
                phase: row.phase,
                activeSliceId: row.active_slice_id ?? undefined,
                activeMilestoneId: row.active_milestone_id ?? undefined,
                pausedAt: row.paused_at ?? undefined,
                contextJson: row.context_json ?? undefined,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Workflow session: Query failed - ${message}`);
            return null;
        }
    }
    /**
     * Attempt to salvage reviews data.
     */
    static salvageReviews(db, metadata) {
        const reviews = [];
        try {
            const rows = db.prepare("SELECT * FROM review ORDER BY created_at").all();
            for (const row of rows) {
                try {
                    // Validate required fields
                    if (!row.slice_id || typeof row.slice_id !== "string") {
                        metadata.corruptionNotes.push(`Review: Skipping row with invalid slice_id`);
                        continue;
                    }
                    if (!row.type || typeof row.type !== "string") {
                        metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid type`);
                        continue;
                    }
                    if (!row.reviewer || typeof row.reviewer !== "string") {
                        metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid reviewer`);
                        continue;
                    }
                    if (!row.verdict || typeof row.verdict !== "string") {
                        metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid verdict`);
                        continue;
                    }
                    if (!row.commit_sha || typeof row.commit_sha !== "string") {
                        metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid commit_sha`);
                        continue;
                    }
                    if (!row.created_at || typeof row.created_at !== "string") {
                        metadata.corruptionNotes.push(`Review ${row.slice_id}: Missing or invalid created_at`);
                        continue;
                    }
                    reviews.push({
                        sliceId: row.slice_id,
                        type: row.type,
                        reviewer: row.reviewer,
                        verdict: row.verdict,
                        commitSha: row.commit_sha,
                        notes: row.notes ?? undefined,
                        createdAt: row.created_at,
                    });
                }
                catch (rowError) {
                    const message = rowError instanceof Error ? rowError.message : String(rowError);
                    metadata.corruptionNotes.push(`Review row: ${message}`);
                }
            }
            metadata.tablesSalvaged.push("review");
            metadata.rowsRecovered += reviews.length;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            metadata.corruptionNotes.push(`Reviews: Query failed - ${message}`);
        }
        return reviews;
    }
}
//# sourceMappingURL=sqlite-salvage.js.map