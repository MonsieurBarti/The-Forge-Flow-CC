import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, isOk, Ok } from "../../domain/result.js";
export const generateState = async (input, deps) => {
    const milestoneResult = deps.milestoneStore.getMilestone(input.milestoneId);
    if (!isOk(milestoneResult))
        return milestoneResult;
    if (!milestoneResult.data) {
        return Err(createDomainError("NOT_FOUND", `Milestone "${input.milestoneId}" not found`));
    }
    const milestoneName = milestoneResult.data.name;
    const slicesResult = deps.sliceStore.listSlices(input.milestoneId);
    if (!isOk(slicesResult))
        return slicesResult;
    const slices = slicesResult.data;
    const sliceStats = [];
    let totalTasks = 0;
    let closedTasks = 0;
    for (const slice of slices) {
        const tasksResult = deps.taskStore.listTasks(slice.id);
        const tasks = isOk(tasksResult) ? tasksResult.data : [];
        const sliceClosed = tasks.filter((t) => t.status === "closed").length;
        sliceStats.push({
            title: slice.title,
            status: slice.status,
            totalTasks: tasks.length,
            closedTasks: sliceClosed,
        });
        totalTasks += tasks.length;
        closedTasks += sliceClosed;
    }
    const closedSlices = slices.filter((s) => s.status === "closed").length;
    const lines = [
        `# State — ${milestoneName}`,
        "",
        "## Progress",
        `- Slices: ${closedSlices}/${slices.length} completed`,
        `- Tasks: ${closedTasks}/${totalTasks} completed`,
        "",
    ];
    if (sliceStats.length > 0) {
        lines.push("## Slices", "| Slice | Status | Tasks | Progress |", "|---|---|---|---|");
        for (const stat of sliceStats) {
            const pct = stat.totalTasks > 0 ? Math.round((stat.closedTasks / stat.totalTasks) * 100) : 0;
            lines.push(`| ${stat.title} | ${stat.status} | ${stat.closedTasks}/${stat.totalTasks} | ${pct}% |`);
        }
    }
    lines.push("");
    await deps.artifactStore.write(".tff/STATE.md", lines.join("\n"));
    return Ok(undefined);
};
//# sourceMappingURL=generate-state.js.map