import type { DomainError } from "../../domain/errors/domain-error.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import { sliceLabelFor } from "../../domain/helpers/branch-naming.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { Err, isOk, Ok, type Result } from "../../domain/result.js";
import { DEBUG_DIR, QUICK_DIR, STATE_FILE } from "../../shared/paths.js";

export type GenerateStateInput =
	| { scope: "milestone"; milestoneId: string }
	| { scope: "kind"; kind: "quick" | "debug" }
	// Backwards-compatible: legacy callers pass only { milestoneId }.
	| { milestoneId: string };

interface RenderStateDeps {
	milestoneStore: MilestoneStore;
	sliceStore: SliceStore;
	taskStore: TaskStore;
}
interface GenerateStateDeps extends RenderStateDeps {
	artifactStore: ArtifactStore;
}

const normalizeInput = (
	input: GenerateStateInput,
): { scope: "milestone"; milestoneId: string } | { scope: "kind"; kind: "quick" | "debug" } => {
	if ("scope" in input) return input;
	return { scope: "milestone", milestoneId: input.milestoneId };
};

const outputPathFor = (
	input: { scope: "milestone"; milestoneId: string } | { scope: "kind"; kind: "quick" | "debug" },
): string => {
	if (input.scope === "milestone") return STATE_FILE;
	return input.kind === "quick" ? `${QUICK_DIR}/STATE.md` : `${DEBUG_DIR}/STATE.md`;
};

interface SliceRow {
	label: string;
	status: string;
	totalTasks: number;
	closedTasks: number;
}

const buildSliceRows = (
	slices: ReadonlyArray<{
		id: string;
		kind: "milestone" | "quick" | "debug";
		number: number;
		title: string;
		status: string;
	}>,
	deps: RenderStateDeps,
	milestone?: { number: number },
): { rows: SliceRow[]; totalTasks: number; closedTasks: number; closedSlices: number } => {
	const rows: SliceRow[] = [];
	let totalTasks = 0;
	let closedTasks = 0;
	let closedSlices = 0;
	for (const slice of slices) {
		const tasksResult = deps.taskStore.listTasks(slice.id);
		const tasks = isOk(tasksResult) ? tasksResult.data : [];
		const sliceClosed = tasks.filter((t) => t.status === "closed").length;
		const label = sliceLabelFor(slice, milestone);
		rows.push({
			label: `${label} ${slice.title}`,
			status: slice.status,
			totalTasks: tasks.length,
			closedTasks: sliceClosed,
		});
		totalTasks += tasks.length;
		closedTasks += sliceClosed;
		if (slice.status === "closed") closedSlices += 1;
	}
	return { rows, totalTasks, closedTasks, closedSlices };
};

const renderLines = (
	header: string,
	rows: SliceRow[],
	totals: { totalTasks: number; closedTasks: number; closedSlices: number; totalSlices: number },
): string => {
	const lines: string[] = [
		header,
		"",
		"## Progress",
		`- Slices: ${totals.closedSlices}/${totals.totalSlices} completed`,
		`- Tasks: ${totals.closedTasks}/${totals.totalTasks} completed`,
		"",
	];
	if (rows.length > 0) {
		lines.push("## Slices", "| Slice | Status | Tasks | Progress |", "|---|---|---|---|");
		for (const row of rows) {
			const pct = row.totalTasks > 0 ? Math.round((row.closedTasks / row.totalTasks) * 100) : 0;
			lines.push(
				`| ${row.label} | ${row.status} | ${row.closedTasks}/${row.totalTasks} | ${pct}% |`,
			);
		}
	}
	lines.push("");
	return lines.join("\n");
};

/**
 * Render STATE.md content synchronously from the stores. Pure: does not touch
 * the filesystem. Used by withTransaction-based callers that must stage writes
 * to *.tmp before the transaction opens.
 */
export const renderStateMd = (
	input: GenerateStateInput,
	deps: RenderStateDeps,
): Result<string, DomainError> => {
	const normalized = normalizeInput(input);

	if (normalized.scope === "milestone") {
		const milestoneResult = deps.milestoneStore.getMilestone(normalized.milestoneId);
		if (!isOk(milestoneResult)) return milestoneResult;
		if (!milestoneResult.data) {
			return Err(createDomainError("NOT_FOUND", `Milestone "${normalized.milestoneId}" not found`));
		}
		const milestone = milestoneResult.data;

		const slicesResult = deps.sliceStore.listSlices(normalized.milestoneId);
		if (!isOk(slicesResult)) return slicesResult;

		const { rows, totalTasks, closedTasks, closedSlices } = buildSliceRows(
			slicesResult.data,
			deps,
			milestone,
		);
		return Ok(
			renderLines(`# State — ${milestone.name}`, rows, {
				totalTasks,
				closedTasks,
				closedSlices,
				totalSlices: slicesResult.data.length,
			}),
		);
	}

	// kind scope
	const slicesResult = deps.sliceStore.listSlicesByKind(normalized.kind);
	if (!isOk(slicesResult)) return slicesResult;

	const { rows, totalTasks, closedTasks, closedSlices } = buildSliceRows(slicesResult.data, deps);
	const heading = normalized.kind === "quick" ? "Quick Slices" : "Debug Slices";
	return Ok(
		renderLines(`# State — ${heading}`, rows, {
			totalTasks,
			closedTasks,
			closedSlices,
			totalSlices: slicesResult.data.length,
		}),
	);
};

export const generateState = async (
	input: GenerateStateInput,
	deps: GenerateStateDeps,
): Promise<Result<void, DomainError>> => {
	const rendered = renderStateMd(input, deps);
	if (!isOk(rendered)) return rendered;
	const normalized = normalizeInput(input);
	const outputPath = outputPathFor(normalized);
	const writeResult = await deps.artifactStore.write(outputPath, rendered.data);
	if (!isOk(writeResult)) return writeResult;
	return Ok(undefined);
};
