import Database from "better-sqlite3";
import { formatMilestoneNumber } from "../../../domain/entities/milestone.js";
import { formatSliceId, transitionSlice } from "../../../domain/entities/slice.js";
import { alreadyClaimedError } from "../../../domain/errors/already-claimed.error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import { hasOpenChildrenError } from "../../../domain/errors/has-open-children.error.js";
import { versionMismatchError } from "../../../domain/errors/version-mismatch.error.js";
import { Err, Ok } from "../../../domain/result.js";
import { getNativeBindingPath } from "./load-native-binding.js";
import { runMigrations } from "./schema.js";
export class SQLiteStateAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    static create(dbPath) {
        const nativeBinding = getNativeBindingPath();
        const db = new Database(dbPath, nativeBinding ? { nativeBinding } : undefined);
        return new SQLiteStateAdapter(db);
    }
    static createInMemory() {
        const nativeBinding = getNativeBindingPath();
        const db = new Database(":memory:", nativeBinding ? { nativeBinding } : undefined);
        return new SQLiteStateAdapter(db);
    }
    // DatabaseInit
    init() {
        try {
            runMigrations(this.db);
            return Ok(undefined);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("VERSION_MISMATCH")) {
                const dbVer = Number(msg.match(/version (\d+)/)?.[1] ?? 0);
                const codeVer = Number(msg.match(/code version (\d+)/)?.[1] ?? 0);
                return Err(versionMismatchError(dbVer, codeVer));
            }
            return Err(createDomainError("WRITE_FAILURE", `Migration failed: ${msg}`));
        }
    }
    close() {
        this.db.close();
    }
    checkpoint() {
        this.db.pragma("wal_checkpoint(PASSIVE)");
    }
    // ProjectStore
    getProject() {
        try {
            const row = this.db
                .prepare("SELECT id, name, vision, created_at FROM project WHERE id = 'singleton'")
                .get();
            if (!row)
                return Ok(null);
            return Ok({
                id: row.id,
                name: row.name,
                vision: row.vision ?? undefined,
                createdAt: new Date(row.created_at),
            });
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get project: ${e}`));
        }
    }
    saveProject(props) {
        try {
            const now = new Date().toISOString();
            this.db
                .prepare(`INSERT INTO project (id, name, vision, created_at, updated_at)
           VALUES ('singleton', ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, vision = excluded.vision, updated_at = excluded.updated_at`)
                .run(props.name, props.vision ?? null, now, now);
            const project = {
                id: "singleton",
                name: props.name,
                vision: props.vision,
                createdAt: new Date(now),
            };
            return Ok(project);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to save project: ${e}`));
        }
    }
    // MilestoneStore
    createMilestone(props) {
        try {
            const id = formatMilestoneNumber(props.number);
            const now = new Date().toISOString();
            this.db
                .prepare(`INSERT INTO milestone (id, project_id, number, name, status, created_at, updated_at)
           VALUES (?, 'singleton', ?, ?, 'open', ?, ?)`)
                .run(id, props.number, props.name, now, now);
            return Ok({
                id,
                projectId: "singleton",
                number: props.number,
                name: props.name,
                status: "open",
                createdAt: new Date(now),
            });
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to create milestone: ${e}`));
        }
    }
    getMilestone(id) {
        try {
            const row = this.db.prepare("SELECT * FROM milestone WHERE id = ?").get(id);
            if (!row)
                return Ok(null);
            return Ok(this.rowToMilestone(row));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get milestone: ${e}`));
        }
    }
    listMilestones() {
        try {
            const rows = this.db.prepare("SELECT * FROM milestone ORDER BY number").all();
            return Ok(rows.map((r) => this.rowToMilestone(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list milestones: ${e}`));
        }
    }
    updateMilestone(id, updates) {
        try {
            const sets = [];
            const values = [];
            if (updates.name !== undefined) {
                sets.push("name = ?");
                values.push(updates.name);
            }
            if (updates.status !== undefined) {
                sets.push("status = ?");
                values.push(updates.status);
            }
            if (sets.length === 0)
                return Ok(undefined);
            sets.push("updated_at = datetime('now')");
            values.push(id);
            this.db.prepare(`UPDATE milestone SET ${sets.join(", ")} WHERE id = ?`).run(...values);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to update milestone: ${e}`));
        }
    }
    closeMilestone(id, reason) {
        try {
            const openSlices = this.db
                .prepare("SELECT COUNT(*) as count FROM slice WHERE milestone_id = ? AND status != 'closed'")
                .get(id);
            if (openSlices.count > 0) {
                return Err(hasOpenChildrenError(id, openSlices.count));
            }
            this.db
                .prepare("UPDATE milestone SET status = 'closed', close_reason = ?, updated_at = datetime('now') WHERE id = ?")
                .run(reason ?? null, id);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to close milestone: ${e}`));
        }
    }
    // SliceStore
    createSlice(props) {
        try {
            const milestone = this.db
                .prepare("SELECT number FROM milestone WHERE id = ?")
                .get(props.milestoneId);
            if (!milestone) {
                return Err(createDomainError("NOT_FOUND", `Milestone "${props.milestoneId}" not found`));
            }
            const id = formatSliceId(milestone.number, props.number);
            const now = new Date().toISOString();
            this.db
                .prepare(`INSERT INTO slice (id, milestone_id, number, title, status, tier, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'discussing', ?, ?, ?)`)
                .run(id, props.milestoneId, props.number, props.title, props.tier ?? null, now, now);
            return Ok({
                id,
                milestoneId: props.milestoneId,
                number: props.number,
                title: props.title,
                status: "discussing",
                tier: props.tier,
                createdAt: new Date(now),
            });
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to create slice: ${e}`));
        }
    }
    getSlice(id) {
        try {
            const row = this.db.prepare("SELECT * FROM slice WHERE id = ?").get(id);
            if (!row)
                return Ok(null);
            return Ok(this.rowToSlice(row));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get slice: ${e}`));
        }
    }
    listSlices(milestoneId) {
        try {
            const rows = milestoneId
                ? this.db
                    .prepare("SELECT * FROM slice WHERE milestone_id = ? ORDER BY number")
                    .all(milestoneId)
                : this.db.prepare("SELECT * FROM slice ORDER BY milestone_id, number").all();
            return Ok(rows.map((r) => this.rowToSlice(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list slices: ${e}`));
        }
    }
    updateSlice(id, updates) {
        try {
            const sets = [];
            const values = [];
            if (updates.title !== undefined) {
                sets.push("title = ?");
                values.push(updates.title);
            }
            if (updates.tier !== undefined) {
                sets.push("tier = ?");
                values.push(updates.tier);
            }
            if (sets.length === 0)
                return Ok(undefined);
            sets.push("updated_at = datetime('now')");
            values.push(id);
            this.db.prepare(`UPDATE slice SET ${sets.join(", ")} WHERE id = ?`).run(...values);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to update slice: ${e}`));
        }
    }
    transitionSlice(id, target) {
        try {
            const getResult = this.getSlice(id);
            if (!getResult.ok)
                return getResult;
            if (!getResult.data) {
                return Err(createDomainError("NOT_FOUND", `Slice "${id}" not found`));
            }
            const domainResult = transitionSlice(getResult.data, target);
            if (!domainResult.ok)
                return domainResult;
            this.db
                .prepare("UPDATE slice SET status = ?, updated_at = datetime('now') WHERE id = ?")
                .run(target, id);
            return Ok(domainResult.data.events);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to transition slice: ${e}`));
        }
    }
    // TaskStore
    createTask(props) {
        try {
            const id = `${props.sliceId}-T${props.number.toString().padStart(2, "0")}`;
            const now = new Date().toISOString();
            this.db
                .prepare(`INSERT INTO task (id, slice_id, number, title, description, status, wave, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`)
                .run(id, props.sliceId, props.number, props.title, props.description ?? null, props.wave ?? null, now, now);
            return Ok({
                id,
                sliceId: props.sliceId,
                number: props.number,
                title: props.title,
                description: props.description,
                status: "open",
                wave: props.wave,
                createdAt: new Date(now),
            });
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to create task: ${e}`));
        }
    }
    getTask(id) {
        try {
            const row = this.db.prepare("SELECT * FROM task WHERE id = ?").get(id);
            if (!row)
                return Ok(null);
            return Ok(this.rowToTask(row));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get task: ${e}`));
        }
    }
    listTasks(sliceId) {
        try {
            const rows = this.db
                .prepare("SELECT * FROM task WHERE slice_id = ? ORDER BY number")
                .all(sliceId);
            return Ok(rows.map((r) => this.rowToTask(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list tasks: ${e}`));
        }
    }
    updateTask(id, updates) {
        try {
            const sets = [];
            const values = [];
            if (updates.title !== undefined) {
                sets.push("title = ?");
                values.push(updates.title);
            }
            if (updates.description !== undefined) {
                sets.push("description = ?");
                values.push(updates.description);
            }
            if (updates.wave !== undefined) {
                sets.push("wave = ?");
                values.push(updates.wave);
            }
            if (sets.length === 0)
                return Ok(undefined);
            sets.push("updated_at = datetime('now')");
            values.push(id);
            this.db.prepare(`UPDATE task SET ${sets.join(", ")} WHERE id = ?`).run(...values);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to update task: ${e}`));
        }
    }
    claimTask(id, claimedBy) {
        try {
            const info = claimedBy !== undefined
                ? this.db
                    .prepare("UPDATE task SET status = 'in_progress', claimed_at = datetime('now'), claimed_by = ?, updated_at = datetime('now') WHERE id = ? AND status = 'open'")
                    .run(claimedBy, id)
                : this.db
                    .prepare("UPDATE task SET status = 'in_progress', claimed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'open'")
                    .run(id);
            if (info.changes === 0) {
                return Err(alreadyClaimedError(id));
            }
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to claim task: ${e}`));
        }
    }
    closeTask(id, reason) {
        try {
            this.db
                .prepare("UPDATE task SET status = 'closed', closed_reason = ?, updated_at = datetime('now') WHERE id = ?")
                .run(reason ?? null, id);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to close task: ${e}`));
        }
    }
    listReadyTasks(sliceId) {
        try {
            const rows = this.db
                .prepare(`SELECT * FROM task
           WHERE slice_id = ? AND status = 'open'
           AND NOT EXISTS (
             SELECT 1 FROM dependency d
             JOIN task blocker ON d.to_id = blocker.id
             WHERE d.from_id = task.id AND blocker.status != 'closed'
           )
           ORDER BY number`)
                .all(sliceId);
            return Ok(rows.map((r) => this.rowToTask(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list ready tasks: ${e}`));
        }
    }
    listStaleClaims(ttlMinutes) {
        try {
            const rows = this.db
                .prepare(`SELECT * FROM task
           WHERE status = 'in_progress'
           AND claimed_at < datetime('now', (-1 * ?) || ' minutes')
           ORDER BY claimed_at`)
                .all(ttlMinutes);
            return Ok(rows.map((r) => this.rowToTask(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list stale claims: ${e}`));
        }
    }
    getExecutorsForSlice(sliceId) {
        try {
            const rows = this.db
                .prepare("SELECT DISTINCT claimed_by FROM task WHERE slice_id = ? AND claimed_by IS NOT NULL")
                .all(sliceId);
            return Ok(rows.map((r) => r.claimed_by));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get executors for slice: ${e}`));
        }
    }
    // DependencyStore
    addDependency(fromId, toId, type) {
        try {
            this.db
                .prepare("INSERT OR REPLACE INTO dependency (from_id, to_id, type) VALUES (?, ?, ?)")
                .run(fromId, toId, type);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to add dependency: ${e}`));
        }
    }
    removeDependency(fromId, toId) {
        try {
            this.db.prepare("DELETE FROM dependency WHERE from_id = ? AND to_id = ?").run(fromId, toId);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to remove dependency: ${e}`));
        }
    }
    getDependencies(taskId) {
        try {
            const rows = this.db
                .prepare("SELECT from_id, to_id, type FROM dependency WHERE from_id = ? OR to_id = ?")
                .all(taskId, taskId);
            return Ok(rows.map((r) => ({ fromId: r.from_id, toId: r.to_id, type: r.type })));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get dependencies: ${e}`));
        }
    }
    // SessionStore
    getSession() {
        try {
            const row = this.db.prepare("SELECT * FROM workflow_session WHERE id = 1").get();
            if (!row)
                return Ok(null);
            return Ok({
                phase: row.phase,
                activeSliceId: row.active_slice_id ?? undefined,
                activeMilestoneId: row.active_milestone_id ?? undefined,
                pausedAt: row.paused_at ?? undefined,
                contextJson: row.context_json ?? undefined,
            });
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get session: ${e}`));
        }
    }
    saveSession(session) {
        try {
            // Disable FK checks for session save: active_slice_id and active_milestone_id may
            // reference IDs that don't exist yet (e.g. during planning before slices are created).
            this.db.pragma("foreign_keys = OFF");
            try {
                this.db
                    .prepare(`INSERT INTO workflow_session (id, phase, active_slice_id, active_milestone_id, paused_at, context_json, updated_at)
             VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET phase = excluded.phase, active_slice_id = excluded.active_slice_id,
             active_milestone_id = excluded.active_milestone_id, paused_at = excluded.paused_at,
             context_json = excluded.context_json, updated_at = datetime('now')`)
                    .run(session.phase, session.activeSliceId ?? null, session.activeMilestoneId ?? null, session.pausedAt ?? null, session.contextJson ?? null);
            }
            finally {
                this.db.pragma("foreign_keys = ON");
            }
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to save session: ${e}`));
        }
    }
    // ReviewStore
    recordReview(review) {
        try {
            this.db
                .prepare(`INSERT INTO review (slice_id, type, reviewer, verdict, commit_sha, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(review.sliceId, review.type, review.reviewer, review.verdict, review.commitSha, review.notes ?? null, review.createdAt);
            return Ok(undefined);
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to record review: ${e}`));
        }
    }
    getLatestReview(sliceId, type) {
        try {
            const row = this.db
                .prepare("SELECT * FROM review WHERE slice_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1")
                .get(sliceId, type);
            if (!row)
                return Ok(null);
            return Ok(this.rowToReview(row));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to get latest review: ${e}`));
        }
    }
    listReviews(sliceId) {
        try {
            const rows = this.db
                .prepare("SELECT * FROM review WHERE slice_id = ? ORDER BY created_at")
                .all(sliceId);
            return Ok(rows.map((r) => this.rowToReview(r)));
        }
        catch (e) {
            return Err(createDomainError("WRITE_FAILURE", `Failed to list reviews: ${e}`));
        }
    }
    // Helpers
    rowToSlice(row) {
        return {
            id: row.id,
            milestoneId: row.milestone_id,
            number: row.number,
            title: row.title,
            status: row.status,
            tier: (row.tier ?? undefined),
            createdAt: new Date(row.created_at),
        };
    }
    rowToTask(row) {
        return {
            id: row.id,
            sliceId: row.slice_id,
            number: row.number,
            title: row.title,
            description: row.description ?? undefined,
            status: row.status,
            wave: row.wave ?? undefined,
            claimedAt: row.claimed_at ? new Date(row.claimed_at) : undefined,
            claimedBy: row.claimed_by ?? undefined,
            closedReason: row.closed_reason ?? undefined,
            createdAt: new Date(row.created_at),
        };
    }
    rowToMilestone(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            number: row.number,
            name: row.name,
            status: row.status,
            closeReason: row.close_reason ?? undefined,
            createdAt: new Date(row.created_at),
        };
    }
    rowToReview(row) {
        return {
            sliceId: row.slice_id,
            type: row.type,
            reviewer: row.reviewer,
            verdict: row.verdict,
            commitSha: row.commit_sha,
            notes: row.notes ?? undefined,
            createdAt: row.created_at,
        };
    }
}
//# sourceMappingURL=sqlite-state.adapter.js.map