/**
 * Canonical slice transition table. This file is the single source of truth
 * for which `SliceStatus` transitions are legal. Both
 * `src/domain/state-machine/slice-state-machine.ts` (validate/SLICE_EDGES) and
 * `src/domain/entities/slice.ts` (`transitionSlice`) delegate to
 * {@link canTransition} / {@link validTransitionsFrom} below — do not fork the
 * edge map in those files.
 */
import { z } from "zod";

export const SliceStatusSchema = z.enum([
	"discussing",
	"researching",
	"planning",
	"executing",
	"verifying",
	"reviewing",
	"completing",
	"closed",
]);

export type SliceStatus = z.infer<typeof SliceStatusSchema>;

const transitions: Record<SliceStatus, readonly SliceStatus[]> = {
	discussing: ["researching"],
	researching: ["planning"],
	planning: ["planning", "executing"],
	executing: ["verifying"],
	verifying: ["reviewing", "executing"],
	reviewing: ["completing", "executing"],
	completing: ["closed"],
	closed: [],
};

export const canTransition = (from: SliceStatus, to: SliceStatus): boolean =>
	transitions[from].includes(to);

export const validTransitionsFrom = (status: SliceStatus): readonly SliceStatus[] =>
	transitions[status];

export const validPredecessorsOf = (target: SliceStatus): readonly SliceStatus[] =>
	(Object.entries(transitions) as [SliceStatus, readonly SliceStatus[]][])
		.filter(([, nexts]) => nexts.includes(target))
		.map(([from]) => from);
