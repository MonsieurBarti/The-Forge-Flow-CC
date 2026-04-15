import { formatMilestoneNumber } from "../../domain/entities/milestone.js";
import { formatSliceId, transitionSlice } from "../../domain/entities/slice.js";
import { alreadyClaimedError } from "../../domain/errors/already-claimed.error.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import { hasOpenChildrenError } from "../../domain/errors/has-open-children.error.js";
import { Err, Ok } from "../../domain/result.js";
export class InMemoryStateAdapter {
    project = null;
    milestones = new Map();
    slices = new Map();
    tasks = new Map();
    dependencies = [];
    session = null;
    reviews = [];
    init() {
        return Ok(undefined);
    }
    // ProjectStore
    getProject() {
        return Ok(this.project);
    }
    saveProject(props) {
        const project = {
            id: "singleton",
            name: props.name,
            vision: props.vision,
            createdAt: this.project?.createdAt ?? new Date(),
        };
        this.project = project;
        return Ok(project);
    }
    // MilestoneStore
    createMilestone(props) {
        const id = formatMilestoneNumber(props.number);
        const milestone = {
            id,
            projectId: "singleton",
            number: props.number,
            name: props.name,
            status: "open",
            createdAt: new Date(),
        };
        this.milestones.set(id, milestone);
        return Ok(milestone);
    }
    getMilestone(id) {
        return Ok(this.milestones.get(id) ?? null);
    }
    listMilestones() {
        return Ok([...this.milestones.values()]);
    }
    updateMilestone(id, updates) {
        const ms = this.milestones.get(id);
        if (!ms)
            return Ok(undefined);
        if (updates.name !== undefined)
            ms.name = updates.name;
        if (updates.status !== undefined)
            ms.status = updates.status;
        this.milestones.set(id, ms);
        return Ok(undefined);
    }
    closeMilestone(id, reason) {
        const ms = this.milestones.get(id);
        if (!ms)
            return Ok(undefined);
        const openSlices = [...this.slices.values()].filter((s) => s.milestoneId === id && s.status !== "closed");
        if (openSlices.length > 0) {
            return Err(hasOpenChildrenError(id, openSlices.length));
        }
        ms.status = "closed";
        ms.closeReason = reason;
        this.milestones.set(id, ms);
        return Ok(undefined);
    }
    // SliceStore
    createSlice(props) {
        const milestone = this.milestones.get(props.milestoneId);
        if (!milestone) {
            return Err(createDomainError("NOT_FOUND", `Milestone "${props.milestoneId}" not found`));
        }
        const id = formatSliceId(milestone.number, props.number);
        const slice = {
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
    getSlice(id) {
        return Ok(this.slices.get(id) ?? null);
    }
    listSlices(milestoneId) {
        const all = [...this.slices.values()];
        if (milestoneId) {
            return Ok(all.filter((s) => s.milestoneId === milestoneId));
        }
        return Ok(all);
    }
    updateSlice(id, updates) {
        const slice = this.slices.get(id);
        if (!slice)
            return Ok(undefined);
        if (updates.title !== undefined)
            slice.title = updates.title;
        if (updates.tier !== undefined)
            slice.tier = updates.tier;
        this.slices.set(id, slice);
        return Ok(undefined);
    }
    transitionSlice(id, target) {
        const slice = this.slices.get(id);
        if (!slice) {
            return Err(createDomainError("NOT_FOUND", `Slice "${id}" not found`));
        }
        const domainResult = transitionSlice(slice, target);
        if (!domainResult.ok)
            return domainResult;
        this.slices.set(id, domainResult.data.slice);
        return Ok(domainResult.data.events);
    }
    // TaskStore
    createTask(props) {
        const id = `${props.sliceId}-T${props.number.toString().padStart(2, "0")}`;
        const task = {
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
    getTask(id) {
        return Ok(this.tasks.get(id) ?? null);
    }
    listTasks(sliceId) {
        return Ok([...this.tasks.values()].filter((t) => t.sliceId === sliceId));
    }
    updateTask(id, updates) {
        const task = this.tasks.get(id);
        if (!task)
            return Ok(undefined);
        if (updates.title !== undefined)
            task.title = updates.title;
        if (updates.description !== undefined)
            task.description = updates.description;
        if (updates.wave !== undefined)
            task.wave = updates.wave;
        this.tasks.set(id, task);
        return Ok(undefined);
    }
    claimTask(id, claimedBy) {
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
    getExecutorsForSlice(sliceId) {
        const executors = [
            ...new Set([...this.tasks.values()]
                .filter((t) => t.sliceId === sliceId && t.claimedBy !== undefined)
                .map((t) => t.claimedBy)),
        ];
        return Ok(executors);
    }
    closeTask(id, reason) {
        const task = this.tasks.get(id);
        if (!task)
            return Ok(undefined);
        task.status = "closed";
        task.closedReason = reason;
        this.tasks.set(id, task);
        return Ok(undefined);
    }
    listReadyTasks(sliceId) {
        const sliceTasks = [...this.tasks.values()].filter((t) => t.sliceId === sliceId && t.status === "open");
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
    listStaleClaims(ttlMinutes) {
        const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
        const stale = [...this.tasks.values()].filter((t) => t.status === "in_progress" && t.claimedAt !== undefined && t.claimedAt < cutoff);
        return Ok(stale);
    }
    // DependencyStore
    addDependency(fromId, toId, type) {
        const existing = this.dependencies.find((d) => d.fromId === fromId && d.toId === toId);
        if (!existing) {
            this.dependencies.push({ fromId, toId, type });
        }
        return Ok(undefined);
    }
    removeDependency(fromId, toId) {
        this.dependencies = this.dependencies.filter((d) => !(d.fromId === fromId && d.toId === toId));
        return Ok(undefined);
    }
    getDependencies(taskId) {
        const deps = this.dependencies
            .filter((d) => d.fromId === taskId || d.toId === taskId)
            .map((d) => ({ fromId: d.fromId, toId: d.toId, type: d.type }));
        return Ok(deps);
    }
    // SessionStore
    getSession() {
        return Ok(this.session);
    }
    saveSession(session) {
        this.session = session;
        return Ok(undefined);
    }
    // ReviewStore
    recordReview(review) {
        this.reviews.push(review);
        return Ok(undefined);
    }
    getLatestReview(sliceId, type) {
        const matching = this.reviews
            .filter((r) => r.sliceId === sliceId && r.type === type)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return Ok(matching[0] ?? null);
    }
    listReviews(sliceId) {
        return Ok(this.reviews.filter((r) => r.sliceId === sliceId));
    }
    // Test helpers
    seedReviews(reviews) {
        this.reviews.push(...reviews);
    }
    seedExecutors(sliceId, agents) {
        agents.forEach((agent, idx) => {
            const id = `${sliceId}-executor-seed-${idx}`;
            const existing = this.tasks.get(id);
            if (existing) {
                existing.claimedBy = agent;
                this.tasks.set(id, existing);
            }
            else {
                const task = {
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
//# sourceMappingURL=in-memory-state-adapter.js.map